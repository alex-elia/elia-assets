import type { EdaClient } from "../client.js";
import type { AcquiredSource, ReadOptions, SearchResult } from "../types.js";

export type SearchAndReadOptions = {
  maxHits?: number;
  readOptions?: ReadOptions;
};

export type SearchAndReadResult = {
  search: SearchResult;
  pages: AcquiredSource[];
};

/**
 * Discovery (snippets) then bounded page acquisition. Hosts own ranking, filtering and storage.
 */
export async function searchAndReadPages(
  eda: EdaClient,
  query: string,
  options?: SearchAndReadOptions,
): Promise<SearchAndReadResult> {
  const maxHits = options?.maxHits ?? 3;
  const search = await eda.search(query);
  const urls = search.hits.map((hit) => hit.url).filter(Boolean).slice(0, maxHits);

  const pages: AcquiredSource[] = [];
  for (const url of urls) {
    pages.push(await eda.read(url, options?.readOptions));
  }

  return { search, pages };
}
