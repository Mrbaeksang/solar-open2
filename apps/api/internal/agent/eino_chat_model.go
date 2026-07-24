package agent

import (
	"context"
	"errors"
	"io"
	"strings"

	"github.com/Mrbaeksang/solar-open2/apps/api/internal/provider"
	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"
)

// einoChatModel adapts the provider boundary to Eino's canonical
// BaseChatModel contract so generation participates in Runnable.Stream.
type einoChatModel struct {
	inner provider.ChatModel
}

func (chat einoChatModel) Generate(
	ctx context.Context,
	messages []*schema.Message,
	_ ...model.Option,
) (*schema.Message, error) {
	stream, err := chat.Stream(ctx, messages)
	if err != nil {
		return nil, err
	}
	defer stream.Close()

	var answer strings.Builder
	for {
		message, streamErr := stream.Recv()
		if errors.Is(streamErr, io.EOF) {
			break
		}
		if streamErr != nil {
			return nil, streamErr
		}
		if message != nil {
			answer.WriteString(message.Content)
		}
	}
	return schema.AssistantMessage(answer.String(), nil), nil
}

func (chat einoChatModel) Stream(
	ctx context.Context,
	messages []*schema.Message,
	_ ...model.Option,
) (*schema.StreamReader[*schema.Message], error) {
	request, err := providerRequest(messages)
	if err != nil {
		return nil, err
	}
	source, err := chat.inner.Stream(ctx, request)
	if err != nil {
		return nil, err
	}

	reader, writer := schema.Pipe[*schema.Message](1)
	go func() {
		defer writer.Close()
		defer source.Close()
		for {
			chunk, streamErr := source.Recv()
			if errors.Is(streamErr, io.EOF) {
				return
			}
			if streamErr != nil {
				writer.Send(nil, streamErr)
				return
			}
			if chunk == "" {
				continue
			}
			if writer.Send(schema.AssistantMessage(chunk, nil), nil) {
				return
			}
		}
	}()
	return reader, nil
}

func providerRequest(messages []*schema.Message) (provider.ChatRequest, error) {
	var systemPrompt strings.Builder
	var userPrompt strings.Builder
	for _, message := range messages {
		if message == nil || strings.TrimSpace(message.Content) == "" {
			continue
		}
		switch message.Role {
		case schema.System:
			if systemPrompt.Len() > 0 {
				systemPrompt.WriteByte('\n')
			}
			systemPrompt.WriteString(message.Content)
		case schema.User:
			if userPrompt.Len() > 0 {
				userPrompt.WriteByte('\n')
			}
			userPrompt.WriteString(message.Content)
		}
	}
	if systemPrompt.Len() == 0 || userPrompt.Len() == 0 {
		return provider.ChatRequest{}, errors.New("Eino chat model requires system and user messages")
	}
	return provider.ChatRequest{
		SystemPrompt: systemPrompt.String(),
		UserPrompt:   userPrompt.String(),
	}, nil
}
