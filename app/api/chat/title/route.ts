import { supabase } from "@/lib/supabase";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { NextRequest, NextResponse } from "next/server";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // TODO: Implement authentication check here
    // For now, we'll proceed without explicit auth, but it's crucial for production.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await generateText({
      model: openai("gpt-5"),
      system: "You are a helpful assistant that generates concise chat titles.",
      prompt: `Generate a concise title for the following chat messages: ${messages[0].content}`,
    });

    return NextResponse.json({ title: result.text });
  } catch (error) {
    console.error("Error generating chat title:", error);
    return NextResponse.json(
      { error: "Failed to generate chat title." },
      { status: 500 }
    );
  }
}
