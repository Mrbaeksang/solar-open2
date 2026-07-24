CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS sources (
    id text PRIMARY KEY,
    publisher text NOT NULL,
    title text NOT NULL,
    edition_or_version text NOT NULL,
    published_at text NOT NULL,
    summary text NOT NULL,
    license text NOT NULL,
    license_url text NOT NULL,
    url text NOT NULL,
    reviewed_at text NOT NULL,
    kind text NOT NULL,
    usage text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS passages (
    id text PRIMARY KEY,
    track text NOT NULL CHECK (track IN ('easy', 'standard', 'common')),
    chapter_id text NOT NULL,
    chapter_title text NOT NULL,
    section_id text NOT NULL,
    section_title text NOT NULL,
    body text NOT NULL,
    source_ids text[] NOT NULL DEFAULT '{}',
    claim_ids text[] NOT NULL DEFAULT '{}',
    embedding vector(1024) NOT NULL,
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('simple', coalesce(chapter_title, '') || ' ' ||
            coalesce(section_title, '') || ' ' || coalesce(body, ''))
    ) STORED,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS passages_search_idx
    ON passages USING gin (search_vector);

CREATE INDEX IF NOT EXISTS passages_embedding_idx
    ON passages USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS passages_scope_idx
    ON passages (track, chapter_id, section_id);
