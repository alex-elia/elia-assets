# Amira Retrieval Orchestration (ARO)

**`@elia/amira-retrieval`** fuses **lexical** corpus search with **semantic** KDI/pgvector hits into one ranked evidence set and formats grounding blocks for LLM prompts.

Named in honor of **Amira Bezciyan**. This package does not call chat models (OpenRouter unifies *generation* only). ARO unifies **retrieval** so hosts get stable evidence regardless of which LLM answers.

## Stack position

| Layer | Package / host |
|-------|----------------|
| Acquisition | Ermis EDA (`@elia/ermis-data-acquisition`) |
| Indexing | Komitas KDI (`@elia/komitas-data-indexing`) |
| **Retrieval orchestration** | **Amira ARO (this package)** |
| Persona + chat | Host (`asikz` assistant, Nemrut edge functions) |

## Host responsibilities

- Run lexical search (e.g. `corpus.researchQuery`, Postgres FTS).
- Run semantic search (KDI Edge `int-kdi-rag-search` or `VectorIndex.searchSimilar`).
- Pass normalized hits into `hybridRetrieve()`.
- Inject `formatRetrievalContext()` into the system prompt.

## Version

`ARO_METHOD_VERSION` is bumped when fusion or context format changes.
