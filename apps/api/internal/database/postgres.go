package database

import (
	"context"
	"embed"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/Mrbaeksang/solar-open2/apps/api/internal/domain"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/retrieval"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrations embed.FS

// Postgres is the Railway PostgreSQL/pgvector hybrid retrieval store.
type Postgres struct {
	pool *pgxpool.Pool
}

// Open connects using DATABASE_URL, including Railway private-network URLs.
func Open(ctx context.Context, databaseURL string) (*Postgres, error) {
	if strings.TrimSpace(databaseURL) == "" {
		return nil, errors.New("DATABASE_URL is required")
	}
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}
	config.MaxConns = 8
	config.MinConns = 1
	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("open postgres: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping postgres: %w", err)
	}
	return &Postgres{pool: pool}, nil
}

// Close releases the connection pool.
func (p *Postgres) Close() {
	p.pool.Close()
}

// Migrate applies the idempotent pgvector schema.
func (p *Postgres) Migrate(ctx context.Context) error {
	schema, err := migrations.ReadFile("migrations/001_init.sql")
	if err != nil {
		return fmt.Errorf("read migration: %w", err)
	}
	if _, err := p.pool.Exec(ctx, string(schema)); err != nil {
		return fmt.Errorf("apply migration: %w", err)
	}
	return nil
}

// Search combines cosine similarity and PostgreSQL full-text rank.
func (p *Postgres) Search(ctx context.Context, query domain.SearchQuery) ([]domain.Passage, error) {
	if err := query.Track.Validate(); err != nil {
		return nil, err
	}
	if len(query.Vector) != 1024 {
		return nil, fmt.Errorf("query embedding dimension = %d, want 1024", len(query.Vector))
	}
	if query.Limit <= 0 || query.Limit > 12 {
		query.Limit = 6
	}
	const statement = `
WITH ranked AS (
    SELECT
        id, track, chapter_id, chapter_title, section_id, section_title,
        body, source_ids, claim_ids,
        1 - (embedding <=> $1::vector) AS semantic_score,
        ts_rank_cd(search_vector, plainto_tsquery('simple', $2)) AS lexical_score
    FROM passages
    WHERE track = $3 OR track = 'common'
)
SELECT
    id, track, chapter_id, chapter_title, section_id, section_title,
    body, source_ids, claim_ids,
    (
        greatest(semantic_score, 0) * 0.62 +
        lexical_score * 0.38 +
        CASE
            WHEN track = $3 AND chapter_id = $4 AND section_id = $5 THEN 0.62
            WHEN track = $3 AND chapter_id = $4 THEN 0.34
            WHEN track = $3 THEN 0.12
            ELSE 0.03
        END
    ) AS score
FROM ranked
WHERE semantic_score > 0.02 OR lexical_score > 0
ORDER BY score DESC, id
LIMIT $6`
	rows, err := p.pool.Query(
		ctx,
		statement,
		vectorLiteral(query.Vector),
		query.Text,
		string(query.Track),
		query.ChapterID,
		query.SectionID,
		query.Limit,
	)
	if err != nil {
		return nil, fmt.Errorf("hybrid search: %w", err)
	}
	defer rows.Close()

	result := make([]domain.Passage, 0, query.Limit)
	for rows.Next() {
		var passage domain.Passage
		if err := rows.Scan(
			&passage.ID,
			&passage.Track,
			&passage.ChapterID,
			&passage.ChapterTitle,
			&passage.SectionID,
			&passage.SectionTitle,
			&passage.Text,
			&passage.SourceIDs,
			&passage.ClaimIDs,
			&passage.Score,
		); err != nil {
			return nil, fmt.Errorf("scan search result: %w", err)
		}
		result = append(result, passage)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read search results: %w", err)
	}
	return result, nil
}

// ReplaceCorpus atomically upserts reviewed sources and embedded passages.
func (p *Postgres) ReplaceCorpus(
	ctx context.Context,
	sources []domain.Source,
	passages []domain.Passage,
	embedder retrieval.Embedder,
) error {
	if embedder.Dimension() != 1024 {
		return fmt.Errorf("passage embedding dimension = %d, want 1024", embedder.Dimension())
	}
	texts := make([]string, len(passages))
	for index, passage := range passages {
		texts[index] = strings.Join([]string{
			passage.ChapterTitle,
			passage.SectionTitle,
			passage.Text,
		}, "\n")
	}
	vectors, err := embedder.EmbedPassages(ctx, texts)
	if err != nil {
		return fmt.Errorf("embed corpus: %w", err)
	}
	if len(vectors) != len(passages) {
		return errors.New("passage embedding count mismatch")
	}

	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin corpus transaction: %w", err)
	}
	defer tx.Rollback(ctx)
	for _, source := range sources {
		_, err = tx.Exec(ctx, `
INSERT INTO sources (
    id, publisher, title, edition_or_version, published_at, summary,
    license, license_url, url, reviewed_at, kind, usage, updated_at
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
ON CONFLICT (id) DO UPDATE SET
    publisher=EXCLUDED.publisher,
    title=EXCLUDED.title,
    edition_or_version=EXCLUDED.edition_or_version,
    published_at=EXCLUDED.published_at,
    summary=EXCLUDED.summary,
    license=EXCLUDED.license,
    license_url=EXCLUDED.license_url,
    url=EXCLUDED.url,
    reviewed_at=EXCLUDED.reviewed_at,
    kind=EXCLUDED.kind,
    usage=EXCLUDED.usage,
    updated_at=now()`,
			source.ID,
			source.Publisher,
			source.Title,
			source.EditionOrVersion,
			source.PublishedAt,
			source.Summary,
			source.License,
			source.LicenseURL,
			source.URL,
			source.ReviewedAt,
			source.Kind,
			source.Usage,
		)
		if err != nil {
			return fmt.Errorf("upsert source %s: %w", source.ID, err)
		}
	}
	for index, passage := range passages {
		if len(vectors[index]) != 1024 {
			return fmt.Errorf("passage %s embedding dimension = %d", passage.ID, len(vectors[index]))
		}
		_, err = tx.Exec(ctx, `
INSERT INTO passages (
    id, track, chapter_id, chapter_title, section_id, section_title,
    body, source_ids, claim_ids, embedding, updated_at
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::vector,now())
ON CONFLICT (id) DO UPDATE SET
    track=EXCLUDED.track,
    chapter_id=EXCLUDED.chapter_id,
    chapter_title=EXCLUDED.chapter_title,
    section_id=EXCLUDED.section_id,
    section_title=EXCLUDED.section_title,
    body=EXCLUDED.body,
    source_ids=EXCLUDED.source_ids,
    claim_ids=EXCLUDED.claim_ids,
    embedding=EXCLUDED.embedding,
    updated_at=now()`,
			passage.ID,
			string(passage.Track),
			passage.ChapterID,
			passage.ChapterTitle,
			passage.SectionID,
			passage.SectionTitle,
			passage.Text,
			passage.SourceIDs,
			passage.ClaimIDs,
			vectorLiteral(vectors[index]),
		)
		if err != nil {
			return fmt.Errorf("upsert passage %s: %w", passage.ID, err)
		}
	}
	if _, err := tx.Exec(ctx, `
DELETE FROM passages
WHERE NOT (id = ANY($1::text[]))`, passageIDs(passages)); err != nil {
		return fmt.Errorf("remove stale passages: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit corpus transaction: %w", err)
	}
	return nil
}

func vectorLiteral(vector []float32) string {
	var builder strings.Builder
	builder.Grow(len(vector) * 10)
	builder.WriteByte('[')
	for index, value := range vector {
		if index > 0 {
			builder.WriteByte(',')
		}
		builder.WriteString(strconv.FormatFloat(float64(value), 'g', -1, 32))
	}
	builder.WriteByte(']')
	return builder.String()
}

func passageIDs(passages []domain.Passage) []string {
	ids := make([]string, len(passages))
	for index, passage := range passages {
		ids[index] = passage.ID
	}
	return ids
}
