CREATE EXTENSION IF NOT EXISTS vector;

-- One row per chunk and model, so vectors from different models never get compared.
CREATE TABLE IF NOT EXISTS chunk_embeddings (
  chunk_id text NOT NULL,
  model text NOT NULL,
  content_hash text NOT NULL,
  embedding vector NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chunk_id, model)
);

-- Answer cache and rate limit counters, shared by every server instance.
CREATE TABLE IF NOT EXISTS kv (
  key text PRIMARY KEY,
  value text NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS kv_expires_at_idx ON kv (expires_at);
