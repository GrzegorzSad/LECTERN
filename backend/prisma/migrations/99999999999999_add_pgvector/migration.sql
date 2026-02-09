CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Chunk"
ADD COLUMN vector vector(1536);

CREATE INDEX IF NOT EXISTS chunk_vector_idx
ON "Chunk"
USING ivfflat (vector vector_cosine_ops)
WITH (lists = 100);