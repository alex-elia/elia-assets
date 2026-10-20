export interface KdiSearchHit {
  documentId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
  documentName?: string;
  metadata?: Record<string, unknown>;
}

export interface KdiSearchParams {
  queryEmbedding: number[];
  workspaceId: string;
  limit?: number;
  documentScopes?: string[];
}

export interface RpcCaller {
  rpc<T>(
    fn: string,
    args: Record<string, unknown>,
  ): Promise<{ data: T | null; error: { message: string } | null }>;
}

/**
 * Port for vector retrieval. Default implementation calls Supabase RPC
 * `search_kdi_document_chunks` (Asikz) or host-specific wrappers on Nemrut.
 */
export interface VectorIndex {
  searchSimilar(params: KdiSearchParams): Promise<KdiSearchHit[]>;
}

export interface SupabasePgVectorAdapterOptions {
  rpc: RpcCaller;
  /** RPC name on the host database. */
  searchRpcName?: string;
}

export function createSupabasePgVectorAdapter(
  options: SupabasePgVectorAdapterOptions,
): VectorIndex {
  const searchRpcName = options.searchRpcName ?? "search_kdi_document_chunks";

  return {
    async searchSimilar(params: KdiSearchParams) {
      const { data, error } = await options.rpc.rpc<
        Array<{
          document_id: string;
          chunk_index: number;
          content: string;
          similarity: number;
          document_name?: string;
          metadata?: Record<string, unknown>;
        }>
      >(searchRpcName, {
        p_query_embedding: params.queryEmbedding,
        p_workspace_id: params.workspaceId,
        p_limit: params.limit ?? 10,
        p_document_scopes:
          params.documentScopes && params.documentScopes.length > 0
            ? params.documentScopes
            : null,
      });

      if (error) {
        throw new Error(`vector search failed: ${error.message}`);
      }
      if (!data) {
        return [];
      }

      return data.map((row) => ({
        documentId: row.document_id,
        chunkIndex: row.chunk_index,
        content: row.content,
        similarity: row.similarity,
        documentName: row.document_name,
        metadata: row.metadata,
      }));
    },
  };
}
