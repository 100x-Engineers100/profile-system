import { NextResponse } from "next/server";
import {
  createProjectIdea,
  getProjectIdeasByUserId,
  updateProjectIdea,
} from "@/lib/db/queries";

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:8080",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id,
      module_name,
      problem_statement,
      solution,
      chat_history,
      features,
    } = body;

    if (!user_id || !module_name) {
      return new NextResponse("Missing required fields", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const newIdea = await createProjectIdea({
      user_id,
      module_name,
      problem_statement,
      solution,
      chat_history,
      features,
    });
    return NextResponse.json(newIdea, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error("[PROJECT_IDEAS_POST]", error);
    return new NextResponse("Internal Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    let moduleName: string | undefined = searchParams.get("moduleName") || undefined;

    if (!userId) {
      return new NextResponse("Missing userId parameter", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const ideas = await getProjectIdeasByUserId(userId, moduleName);
    return NextResponse.json(ideas, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("[PROJECT_IDEAS_GET]", error);
    return new NextResponse("Internal Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
}

export async function PUT(req: Request) {
  try {
    const {
      userId,
      moduleName,
      chatHistory,
      problem_statement,
      solution,
      features,
    } = await req.json();

    if (!userId || !moduleName) {
      return NextResponse.json(
        { error: "User ID or Module Name is missing" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Only proceed if chatHistory is not empty
    if (!chatHistory || chatHistory.length === 0) {
      return NextResponse.json(
        { error: "Chat history is empty, not saving." },
        { status: 200, headers: corsHeaders }
      );
    }

    // 1. Check if a project idea already exists for the user and module
    const existingIdeas = await getProjectIdeasByUserId(userId, moduleName);
    let projectIdea = null;

    if (existingIdeas && existingIdeas.length > 0) {
      // Assuming we want to update the latest one if multiple exist
      projectIdea = existingIdeas[existingIdeas.length - 1];
    }

    if (projectIdea) {
      // 2. If an idea exists, update it
      const updatedIdea = await updateProjectIdea(projectIdea.id, {
        chat_history: chatHistory,
        problem_statement: problem_statement,
        solution: solution,
        features: features,
      });

      if (!updatedIdea) {
        return NextResponse.json(
          { error: "Failed to update project idea: No idea found or updated" },
          { status: 404, headers: corsHeaders }
        );
      }
      return NextResponse.json(updatedIdea, {
        status: 200,
        headers: corsHeaders,
      });
    } else {
      // 3. If no idea exists, create a new one
      const newIdea = await createProjectIdea({
        user_id: userId,
        module_name: moduleName,
        chat_history: chatHistory,
        problem_statement: problem_statement,
        solution: solution,
        features: features,
      });
      return NextResponse.json(newIdea, { status: 201, headers: corsHeaders });
    }
  } catch (error) {
    console.error("[PROJECT_IDEAS_PUT]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
