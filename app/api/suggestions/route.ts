import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return NextResponse.json({ error: "documentId is required" }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // In a real application, you would fetch suggestions from your database
    // based on the documentId and the authenticated user.
    // For now, we'll return a mock response.
    const mockSuggestions = [
      { id: "1", document_id: documentId, content: "Suggestion 1 for " + documentId, userId: session.user.id },
      { id: "2", document_id: documentId, content: "Suggestion 2 for " + documentId, userId: session.user.id },
    ];

    const suggestions = mockSuggestions.filter(s => s.document_id === documentId && s.userId === session.user.id);

    return NextResponse.json(suggestions, { status: 200 });
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}