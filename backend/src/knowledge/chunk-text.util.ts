const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_CHUNK_OVERLAP = 80;

function readChunkSize(): number {
  const n = Number(process.env.RAG_CHUNK_SIZE || DEFAULT_CHUNK_SIZE);
  return Number.isFinite(n) && n > 100 ? Math.floor(n) : DEFAULT_CHUNK_SIZE;
}

function readChunkOverlap(): number {
  const n = Number(process.env.RAG_CHUNK_OVERLAP || DEFAULT_CHUNK_OVERLAP);
  const size = readChunkSize();
  if (!Number.isFinite(n) || n < 0) return DEFAULT_CHUNK_OVERLAP;
  return Math.min(Math.floor(n), Math.floor(size / 2));
}

/**
 * 按字符切块（带重叠），尽量在换行处截断，避免远超 embedding 单条 token 上限。
 */
export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const size = readChunkSize();
  const overlap = readChunkOverlap();

  if (normalized.length <= size) {
    return [normalized];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + size, normalized.length);

    if (end < normalized.length) {
      const window = normalized.slice(start, end);
      const lastNl = window.lastIndexOf('\n');
      if (lastNl > size * 0.4) {
        end = start + lastNl + 1;
      }
    }

    const piece = normalized.slice(start, end).trim();
    if (piece) chunks.push(piece);

    if (end >= normalized.length) break;
    start = Math.max(0, end - overlap);
    if (start >= normalized.length) break;
  }

  return chunks;
}
