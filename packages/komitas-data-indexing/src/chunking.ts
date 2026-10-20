export interface TextChunk {
  content: string;
  chunkIndex: number;
  start: number;
  end: number;
  metadata?: Record<string, unknown>;
}

export interface ChunkTextOptions {
  chunkSize?: number;
  overlap?: number;
  maxChunks?: number;
}

/**
 * Split text into overlapping chunks (character-based, DIS default).
 */
export function chunkText(
  text: string,
  options: ChunkTextOptions = {},
): TextChunk[] {
  const chunkSize = options.chunkSize ?? 1200;
  const overlap = options.overlap ?? 200;
  const maxChunks = options.maxChunks ?? 1000;

  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < text.length && chunks.length < maxChunks) {
    const end = Math.min(start + chunkSize, text.length);
    const slice = text.slice(start, end);
    const trimmed = slice.trim();
    if (trimmed) {
      chunks.push({
        content: trimmed,
        chunkIndex: chunks.length,
        start,
        end,
      });
    }

    const nextStart = end - overlap;
    if (nextStart <= start) {
      start = end;
    } else {
      start = nextStart;
    }
    if (end >= text.length) {
      break;
    }
  }

  return chunks;
}
