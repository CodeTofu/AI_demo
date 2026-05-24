import { BadRequestException, Injectable } from '@nestjs/common';

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
 * 使用 LangChain PDFLoader + RecursiveCharacterTextSplitter 解析 PDF 并分片。
 */
@Injectable()
export class PdfChunkService {
  async parseAndChunkPdf(buffer: Buffer, filename: string): Promise<string[]> {
    if (!buffer?.length) {
      throw new BadRequestException('PDF 文件为空');
    }

    const { PDFLoader } = await import('@langchain/community/document_loaders/fs/pdf');
    const { RecursiveCharacterTextSplitter } = await import('@langchain/textsplitters');

    const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
    const loader = new PDFLoader(blob, { splitPages: true });
    const docs = await loader.load();

    const rawText = docs
      .map((doc) => doc.pageContent?.trim() ?? '')
      .filter(Boolean)
      .join('\n\n')
      .trim();

    if (!rawText) {
      throw new BadRequestException(
        `无法从 PDF 提取文本：${filename}（可能是扫描件或加密文件）`,
      );
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: readChunkSize(),
      chunkOverlap: readChunkOverlap(),
    });
    const splitDocs = await splitter.splitDocuments(docs);

    const chunks = splitDocs
      .map((doc) => doc.pageContent.trim())
      .filter(Boolean);

    if (chunks.length === 0) {
      throw new BadRequestException(`PDF 分片结果为空：${filename}`);
    }

    return chunks;
  }
}
