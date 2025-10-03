import { LlamaParseReader } from "llama-cloud-services/reader";
import { Document } from "@llamaindex/core/schema";

export class ResumeParser {
  async parseResumeFromUrl(url: string): Promise<Document[]> {
    if (!process.env.LLAMA_CLOUD_API_KEY) {
      throw new Error("LLAMA_CLOUD_API_KEY is not set");
    }

    const reader = new LlamaParseReader({
      apiKey: process.env.LLAMA_CLOUD_API_KEY,
      baseUrl: "https://api.cloud.llamaindex.ai",
    });

    const documents = await reader.loadData(url);
    return documents.map((doc: Document) => {
      const redactedContent = this.redactPii(doc.text);
      return new Document({ ...doc, text: redactedContent });
    });
  }

  private redactPii(text: string): string {
    // Basic regex for email redaction
    let redactedText = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');
    // Basic regex for phone number redaction (matches common formats)
    redactedText = redactedText.replace(/\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE_REDACTED]');
    redactedText = redactedText.replace(/\b[A-Za-z0-9\s,.-]{5,100}\b/g, '[ADDRESS_REDACTED]');
    // You can add more regex patterns for other PII like names, addresses, etc.
    return redactedText;
  }
}
