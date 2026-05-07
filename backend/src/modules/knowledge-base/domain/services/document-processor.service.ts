import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);

  /**
   * Extract text content from an uploaded file.
   * Supports: PDF, TXT, CSV, Markdown
   */
  async extractText(filePath: string, contentType: string): Promise<string> {
    try {
      if (contentType === 'application/pdf') {
        return this.extractFromPdf(filePath);
      }

      if (
        contentType === 'text/plain' ||
        contentType === 'text/csv' ||
        contentType === 'text/markdown' ||
        contentType.startsWith('text/')
      ) {
        return this.extractFromText(filePath);
      }

      this.logger.warn(`Unsupported content type for extraction: ${contentType}`);
      return '';
    } catch (error) {
      this.logger.error(`Text extraction failed for ${filePath}: ${error.message}`, error.stack);
      return '';
    }
  }

  private async extractFromPdf(filePath: string): Promise<string> {
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;
    const buffer = fs.readFileSync(filePath);
    const result = await pdfParse(buffer);
    return result.text || '';
  }

  private async extractFromText(filePath: string): Promise<string> {
    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * Search extracted text for relevant content matching a query.
   * Simple text-based relevance: split into paragraphs, score by keyword overlap.
   */
  searchDocuments(
    documents: { id: string; title: string; extractedText: string }[],
    query: string,
    maxChunks = 3,
    maxCharsPerChunk = 2000,
  ): { title: string; content: string; score: number }[] {
    const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    if (queryWords.length === 0) return [];

    const results: { title: string; content: string; score: number }[] = [];

    for (const doc of documents) {
      if (!doc.extractedText) continue;

      // Split into paragraphs
      const paragraphs = doc.extractedText
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 30);

      for (const para of paragraphs) {
        const paraLower = para.toLowerCase();
        const matchCount = queryWords.filter((w) => paraLower.includes(w)).length;
        if (matchCount > 0) {
          results.push({
            title: doc.title,
            content: para.slice(0, maxCharsPerChunk),
            score: matchCount / queryWords.length,
          });
        }
      }
    }

    // Sort by score descending, take top N
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxChunks);
  }
}
