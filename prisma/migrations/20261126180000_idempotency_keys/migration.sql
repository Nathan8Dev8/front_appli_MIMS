CREATE TABLE "idempotency_keys" (
    "key" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "body" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);
