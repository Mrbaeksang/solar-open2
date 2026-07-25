package agent

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/Mrbaeksang/solar-open2/apps/api/internal/domain"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/policy"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/provider"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/retrieval"
	"github.com/cloudwego/eino/compose"
	"github.com/cloudwego/eino/schema"
)

const (
	evaluateNode = "evaluate-policy"
	prepareNode  = "retrieve-and-ground"
	generateNode = "solar-open2"
)

var (
	urlPattern      = regexp.MustCompile(`(?i)\b(?:https?://|www\.)\S+`)
	citationPattern = regexp.MustCompile(`\[(\d+)\]`)
)

type evaluatedRequest struct {
	Request domain.AgentRequest
	Policy  policy.Result
}

type preparedRequest struct {
	Request      domain.AgentRequest
	Evidence     domain.Evidence
	SystemPrompt string
	UserPrompt   string
	DirectAnswer string
}

type retrievalProgressContextKey struct{}

// Runner executes Eino graphs for grounding and live model generation.
type Runner struct {
	grounding  compose.Runnable[domain.AgentRequest, preparedRequest]
	generation compose.Runnable[[]*schema.Message, *schema.Message]
	registry   map[string]domain.Source
}

// NewRunner builds the policy/retrieval graph and an Eino chat-model graph.
func NewRunner(
	ctx context.Context,
	store retrieval.Store,
	embedder retrieval.Embedder,
	model provider.ChatModel,
	sources []domain.Source,
) (*Runner, error) {
	if store == nil || embedder == nil || model == nil {
		return nil, errors.New("agent dependencies are required")
	}
	registry := make(map[string]domain.Source, len(sources))
	for _, source := range sources {
		if source.ID == "" || source.URL == "" {
			continue
		}
		registry[source.ID] = source
	}
	if len(registry) == 0 {
		return nil, errors.New("source registry is empty")
	}

	graph := compose.NewGraph[domain.AgentRequest, preparedRequest]()
	if err := graph.AddLambdaNode(
		evaluateNode,
		compose.InvokableLambda(func(_ context.Context, request domain.AgentRequest) (evaluatedRequest, error) {
			if err := request.Reading.Validate(); err != nil {
				return evaluatedRequest{}, err
			}
			request.Question = domain.CompactText(request.Question)
			if request.Question == "" {
				return evaluatedRequest{}, errors.New("question is required")
			}
			if len([]rune(request.Question)) > 1_500 {
				return evaluatedRequest{}, errors.New("question is too long")
			}
			request.Reading.SourceIDs = domain.UniqueKnownSourceIDs(
				request.Reading.SourceIDs,
				registry,
				12,
			)
			return evaluatedRequest{
				Request: request,
				Policy:  policy.Evaluate(request.Question, request.Reading.Track),
			}, nil
		}),
	); err != nil {
		return nil, fmt.Errorf("add policy node: %w", err)
	}
	if err := graph.AddLambdaNode(
		prepareNode,
		compose.InvokableLambda(func(ctx context.Context, evaluated evaluatedRequest) (preparedRequest, error) {
			return prepare(ctx, evaluated, store, embedder, registry)
		}),
	); err != nil {
		return nil, fmt.Errorf("add retrieval node: %w", err)
	}
	if err := graph.AddEdge(compose.START, evaluateNode); err != nil {
		return nil, fmt.Errorf("connect graph start: %w", err)
	}
	if err := graph.AddEdge(evaluateNode, prepareNode); err != nil {
		return nil, fmt.Errorf("connect graph nodes: %w", err)
	}
	if err := graph.AddEdge(prepareNode, compose.END); err != nil {
		return nil, fmt.Errorf("connect graph end: %w", err)
	}
	grounding, err := graph.Compile(ctx, compose.WithMaxRunSteps(4))
	if err != nil {
		return nil, fmt.Errorf("compile agent graph: %w", err)
	}

	generationGraph := compose.NewGraph[[]*schema.Message, *schema.Message]()
	if err := generationGraph.AddChatModelNode(
		generateNode,
		einoChatModel{inner: model},
	); err != nil {
		return nil, fmt.Errorf("add Eino chat model: %w", err)
	}
	if err := generationGraph.AddEdge(compose.START, generateNode); err != nil {
		return nil, fmt.Errorf("connect generation start: %w", err)
	}
	if err := generationGraph.AddEdge(generateNode, compose.END); err != nil {
		return nil, fmt.Errorf("connect generation end: %w", err)
	}
	generation, err := generationGraph.Compile(ctx, compose.WithMaxRunSteps(2))
	if err != nil {
		return nil, fmt.Errorf("compile generation graph: %w", err)
	}

	return &Runner{
		grounding:  grounding,
		generation: generation,
		registry:   registry,
	}, nil
}

func prepare(
	ctx context.Context,
	evaluated evaluatedRequest,
	store retrieval.Store,
	embedder retrieval.Embedder,
	registry map[string]domain.Source,
) (preparedRequest, error) {
	request := evaluated.Request
	result := preparedRequest{Request: request}
	if evaluated.Policy.Blocked {
		reportRetrievalProgress(ctx, domain.RetrievalProgress{
			Status: domain.RetrievalSkipped,
		})
		result.Evidence = domain.Evidence{Status: domain.EvidenceOutOfScope}
		result.DirectAnswer = evaluated.Policy.BlockReason
		return result, nil
	}
	if evaluated.Policy.RequiresTrustedAdult {
		reportRetrievalProgress(ctx, domain.RetrievalProgress{
			Status: domain.RetrievalSkipped,
		})
		result.Evidence = domain.Evidence{Status: domain.EvidenceOutOfScope}
		result.DirectAnswer = trustedAdultAnswer(request.Reading.Track)
		return result, nil
	}
	if outsideTextbook(request.Question) {
		reportRetrievalProgress(ctx, domain.RetrievalProgress{
			Status: domain.RetrievalSkipped,
		})
		result.Evidence = domain.Evidence{Status: domain.EvidenceOutOfScope}
		result.DirectAnswer = "이 질문은 지금 교재가 검증한 AI 기초 범위를 벗어납니다. 추측해서 답하지 않고, 교재의 AI 원리·검증·RAG·책임 있는 사용 질문만 도울게요."
		return result, nil
	}

	reportRetrievalProgress(ctx, domain.RetrievalProgress{
		Status: domain.RetrievalSearching,
	})
	searchText := domain.CompactText(strings.Join([]string{
		evaluated.Policy.SanitizedQuestion,
		request.Reading.Selection,
		request.Reading.VisibleContext,
	}, " "))
	vector, err := embedder.EmbedQuery(ctx, searchText)
	if err != nil {
		return preparedRequest{}, fmt.Errorf("embed question: %w", err)
	}
	passages, err := store.Search(ctx, domain.SearchQuery{
		Text:      searchText,
		Track:     request.Reading.Track,
		ChapterID: request.Reading.ChapterID,
		SectionID: request.Reading.SectionID,
		Vector:    vector,
		Limit:     6,
	})
	if err != nil {
		return preparedRequest{}, fmt.Errorf("retrieve evidence: %w", err)
	}

	sourceCandidates := make([]string, 0, len(passages)*2)
	for _, passage := range passages {
		if passage.Track != request.Reading.Track && passage.Track != domain.TrackCommon {
			continue
		}
		sourceCandidates = append(sourceCandidates, passage.SourceIDs...)
	}
	sourceIDs := domain.UniqueKnownSourceIDs(sourceCandidates, registry, 4)
	reportRetrievalProgress(ctx, domain.RetrievalProgress{
		Status:       domain.RetrievalComplete,
		PassageCount: len(passages),
		SourceCount:  len(sourceIDs),
	})
	if len(passages) == 0 || len(sourceIDs) == 0 {
		result.Evidence = domain.Evidence{Status: domain.EvidenceInsufficient}
		result.DirectAnswer = "이 질문에 답할 만한 검토된 교재 근거를 찾지 못했습니다. 내용을 지어내지 않을게요. 질문 범위를 지금 읽는 절의 개념으로 좁혀 주세요."
		return result, nil
	}

	result.Evidence = domain.Evidence{
		Status:    domain.EvidenceSupported,
		SourceIDs: sourceIDs,
	}
	result.SystemPrompt = personaPrompt(request.Reading.Track)
	result.UserPrompt = groundedPrompt(
		evaluated.Policy.SanitizedQuestion,
		request.Reading,
		passages,
		sourceIDs,
	)
	return result, nil
}

func reportRetrievalProgress(
	ctx context.Context,
	progress domain.RetrievalProgress,
) {
	reporter, _ := ctx.Value(retrievalProgressContextKey{}).(domain.RetrievalProgressReporter)
	if reporter != nil {
		reporter(progress)
	}
}

// Run invokes the compiled Eino graph without progress reporting.
func (r *Runner) Run(ctx context.Context, request domain.AgentRequest) (*domain.AgentResult, error) {
	return r.run(ctx, request)
}

// RunWithProgress invokes the graph and reports safe retrieval lifecycle updates.
func (r *Runner) RunWithProgress(
	ctx context.Context,
	request domain.AgentRequest,
	reporter domain.RetrievalProgressReporter,
) (*domain.AgentResult, error) {
	if reporter != nil {
		ctx = context.WithValue(ctx, retrievalProgressContextKey{}, reporter)
	}
	return r.run(ctx, request)
}

func (r *Runner) run(ctx context.Context, request domain.AgentRequest) (*domain.AgentResult, error) {
	prepared, err := r.grounding.Invoke(ctx, request)
	if err != nil {
		return nil, err
	}
	if err := prepared.Evidence.Status.Validate(); err != nil {
		return nil, err
	}
	prepared.Evidence.SourceIDs = domain.UniqueKnownSourceIDs(
		prepared.Evidence.SourceIDs,
		r.registry,
		4,
	)
	if prepared.Evidence.Status != domain.EvidenceSupported {
		prepared.Evidence.SourceIDs = nil
	}
	if prepared.DirectAnswer != "" {
		return &domain.AgentResult{
			Evidence: prepared.Evidence,
			Stream:   domain.NewSliceTextStream(prepared.DirectAnswer, 10_000),
		}, nil
	}

	stream, err := r.generation.Stream(ctx, []*schema.Message{
		schema.SystemMessage(prepared.SystemPrompt),
		schema.UserMessage(prepared.UserPrompt),
	})
	if err != nil {
		return nil, err
	}
	return &domain.AgentResult{
		Evidence: prepared.Evidence,
		Stream:   newSafeMessageStream(stream, len(prepared.Evidence.SourceIDs)),
	}, nil
}

// NewDeterministicRunner creates the same graph with offline adapters.
func NewDeterministicRunner(sources []domain.Source) domain.Runner {
	passages := make([]domain.Passage, 0, len(sources))
	for index, source := range sources {
		passages = append(passages, domain.Passage{
			ID:           "deterministic-" + strconv.Itoa(index+1),
			Track:        domain.TrackEasy,
			ChapterID:    "ai-is",
			ChapterTitle: "AI란 무엇인가",
			SectionID:    "meaning",
			SectionTitle: "AI의 뜻",
			Text:         "AI는 입력을 받아 목표에 맞는 예측, 추천, 결정을 만드는 기계 기반 시스템이다.",
			SourceIDs:    []string{source.ID},
		})
	}
	runner, err := NewRunner(
		context.Background(),
		retrieval.NewMemoryStore(passages),
		provider.Deterministic{},
		provider.Deterministic{},
		sources,
	)
	if err != nil {
		return &failedRunner{err: err}
	}
	return runner
}

type failedRunner struct {
	err error
}

func (f *failedRunner) Run(context.Context, domain.AgentRequest) (*domain.AgentResult, error) {
	return nil, f.err
}

func personaPrompt(track domain.Track) string {
	common := `
당신은 공개 AI 리터러시 교과서 안에서만 답하는 보조 도우미다.
사용자를 실제 사람, 친구, 상담사처럼 대하거나 그런 관계를 암시하지 않는다.
제공된 근거만 사용한다. 모르면 근거가 부족하다고 말한다.
URL을 만들거나 출력하지 않는다. 근거 표시는 제공된 번호 [1] 형식만 쓴다.
답변은 한국어로 간결하게 쓴다. 숫자형 신뢰도나 확률을 제시하지 않는다.`
	if track == domain.TrackEasy {
		return common + `
대상은 초등 고학년부터 중학생이다. 따뜻하고 호기심 많은 과학 안내자처럼 설명한다.
첫 문장에 답을 말하고, 생활 예시, 실제 원리, 비유가 깨지는 지점 순서로 설명한다.
유치한 말투를 쓰지 않는다. 건강·안전·돈·괴롭힘 문제는 신뢰할 수 있는 어른의 도움을 권한다.`
	}
	return common + `
대상은 고등학생 이상 비전공자다. 차분한 연구 멘토처럼 설명한다.
주장, 메커니즘, 구체적 예시, 한계 또는 반례, 근거 순서로 답한다.
마케팅식 단정과 과도한 의인화를 피한다.`
}

func groundedPrompt(
	question string,
	reading domain.ReadingContext,
	passages []domain.Passage,
	sourceIDs []string,
) string {
	sourceNumber := make(map[string]int, len(sourceIDs))
	for index, sourceID := range sourceIDs {
		sourceNumber[sourceID] = index + 1
	}
	var builder strings.Builder
	builder.WriteString("현재 읽기 위치:\n")
	builder.WriteString("- 트랙: " + string(reading.Track) + "\n")
	builder.WriteString("- 장: " + reading.ChapterID + "\n")
	builder.WriteString("- 절: " + reading.SectionID + "\n")
	if reading.Selection != "" {
		builder.WriteString("- 선택한 문장: " + reading.Selection + "\n")
	}
	if reading.VisibleContext != "" {
		builder.WriteString("- 보이는 짧은 문맥: " + reading.VisibleContext + "\n")
	}
	builder.WriteString("\n검토된 근거:\n")
	for _, passage := range passages {
		numbers := make([]string, 0, len(passage.SourceIDs))
		for _, sourceID := range passage.SourceIDs {
			if number, exists := sourceNumber[sourceID]; exists {
				numbers = append(numbers, "["+strconv.Itoa(number)+"]")
			}
		}
		if len(numbers) == 0 {
			continue
		}
		builder.WriteString(strings.Join(numbers, " "))
		builder.WriteString(" ")
		builder.WriteString(passage.ChapterTitle)
		builder.WriteString(" / ")
		builder.WriteString(passage.SectionTitle)
		builder.WriteString(": ")
		builder.WriteString(domain.CompactText(passage.Text))
		builder.WriteByte('\n')
	}
	builder.WriteString("\n질문: ")
	builder.WriteString(question)
	builder.WriteString("\n근거 번호는 실제로 뒷받침하는 문장 뒤에만 붙여라.")
	return builder.String()
}

func trustedAdultAnswer(track domain.Track) string {
	if track == domain.TrackEasy {
		return "이 문제는 AI 교재 도우미가 대신 판단할 수 없습니다. 지금 안전이 걱정되거나 약·돈·괴롭힘과 관련됐다면, 혼자 해결하지 말고 보호자·교사처럼 신뢰할 수 있는 어른에게 바로 알려 주세요."
	}
	return "이 요청은 교재의 AI 기초 설명 범위를 벗어나며 전문 판단을 대신할 수 없습니다. 관련 자격을 가진 전문가나 책임 있는 기관에 확인해 주세요."
}

func outsideTextbook(question string) bool {
	lower := strings.ToLower(question)
	for _, phrase := range []string{
		"오늘 날씨", "주식 종목", "코인 가격", "로또 번호", "축구 결과",
		"맛집 추천", "여행 일정", "연애 상담", "숙제 대신", "시험 답만",
		"weather today", "stock price", "sports score",
	} {
		if strings.Contains(lower, phrase) {
			return true
		}
	}
	return false
}
