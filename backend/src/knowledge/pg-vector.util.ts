/** PostgreSQL pgvector 字面量：`[1,2,3]` */
export function embeddingToPgVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
