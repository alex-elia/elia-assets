# @elia/komitas-data-indexing

**Komitas Data Indexing (KDI)** is the studio-private shared library for document extract/chunk/embed logic and pgvector search ports. Pair with **Ermis Data Acquisition (EDA)** for web/PDF acquisition; hosts own SQL (`dms` schema), storage buckets, and Edge deployables.

## Exports

- `chunkText`, embedding helpers (`generateEmbedding`, `createNodeEmbeddingEnv`)
- `normalizeEmbeddingForPgvector` (1024 → 1536 zero-pad for BGE-M3)
- `createSupabasePgVectorAdapter` (`VectorIndex` port; default RPC `search_kdi_document_chunks`)

## SQL reference

See `sql/dms_workspace_v1.sql` for a single-tenant/workspace variant of the Nemrut `dms` schema. Hosts copy into `supabase/migrations/` and adjust RLS.

## Host responsibilities

- Deploy `int-kdi-*` Edge functions (or Nemrut `int-dms-*` / `int-dis-*`)
- Configure OVH or OpenAI embedding env vars
- Business scopes in `document_meta.metadata.document_scope`
