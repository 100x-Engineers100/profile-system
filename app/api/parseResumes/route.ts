import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { LlamaParseReader } from "llama-cloud-services";
import { Document } from "@llamaindex/core/schema";

// Converts Google Drive share links to direct-download links
function normalizeGoogleDriveUrl(url: string): string {
  const fileIdMatch = url.match(/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  return fileIdMatch
    ? `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`
    : url;
}

// Regex-based redaction for PII
function redactPII(text: string): string {
  return text
    .replace(/\b\d{10}\b/g, "") // 10-digit mobile numbers
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "") // Emails
    .replace(/(https?:\/\/[^\s]+)/gi, (match) =>
      match.includes("linkedin") ? "" : ""
    ); // URLs (LinkedIn or generic)
}

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch profiles with empty resume_content
    const { data: profiles, error: fetchError } = await supabase
      .from("profiles")
      .select("id, resume, resume_content")
      .not("resume", "is", null);

    if (fetchError) throw new Error(fetchError.message);
    if (!profiles?.length) {
      return NextResponse.json({ message: "No profiles with resumes found." });
    }

    const reader = new LlamaParseReader({
      resultType: "markdown",
      apiKey: process.env.LLAMA_CLOUD_API_KEY!,
      baseUrl: "https://api.cloud.llamaindex.ai",
    });

    const parsedResults: any[] = [];

    for (const profile of profiles) {
      // Skip parsing if resume_content already exists
      if (profile.resume_content) {
        console.log(`Skipping parsing for profile ${profile.id}: resume_content already exists.`);
        parsedResults.push({
          profile_id: profile.id,
          status: "skipped",
          message: "resume_content already exists",
        });
        continue; 
      }

      try {
        const normalizedUrl = normalizeGoogleDriveUrl(profile.resume);

        // 2. Fetch the binary file content
        const response = await fetch(normalizedUrl);
        if (!response.ok)
          throw new Error(`Failed to fetch file: ${response.status}`);
        const fileBuffer = await response.arrayBuffer();

        // 3. Upload binary to Supabase storage
        const filePath = `${profile.id}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(filePath, Buffer.from(fileBuffer), {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError)
          throw new Error(`Supabase upload error: ${uploadError.message}`);

        // 4. Get public URL
        const { data: publicUrlData } = supabase.storage
          .from("resumes")
          .getPublicUrl(filePath);
        const publicUrl = publicUrlData.publicUrl;

        console.log(`Parsing resume for profile ${profile.id}: ${publicUrl}`);

        // 5. Parse with LlamaParse
        const documents = await reader.loadData(publicUrl);
        let resumeContent = documents.map((d: Document) => d.text).join("\n\n");

        // 6. Redact PII
        resumeContent = redactPII(resumeContent);

        // 7. Save redacted text
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ resume_content: resumeContent })
          .eq("id", profile.id);

        if (updateError) throw new Error(updateError.message);

        // 8. Delete file from storage after processing
        const { error: deleteError } = await supabase.storage
          .from("resumes")
          .remove([filePath]);

        if (deleteError)
          console.warn(
            `Warning: Could not delete file for profile ${profile.id}`,
            deleteError.message
          );

        parsedResults.push({
          profile_id: profile.id,
          status: "success",
          content_length: resumeContent.length,
        });
      } catch (err: any) {
        console.error(`Error processing profile ${profile.id}:`, err);
        parsedResults.push({
          profile_id: profile.id,
          status: "failed",
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      message: "Resume parsing complete",
      results: parsedResults,
    });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
