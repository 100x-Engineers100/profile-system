import { NextResponse } from "next/server";
import {
  createProjectIdea,
  getProjectIdeasByUserId,
  updateProjectIdea,
} from "@/lib/db/queries";

const ALLOWED_ORIGINS = [
  "https://task-100x-quest.lovable.app",
  "https://profile-system.vercel.app",
  "https://100x-self-discovery.vercel.app",
  "https://self-discovery.100xengineers.com",
  "http://localhost:3001",
  "http://localhost:8080",
];

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get("Origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else {
    headers["Access-Control-Allow-Origin"] = "http://localhost:8080"; // Fallback or default
  }
  return headers;
};

export async function OPTIONS(request: Request) {
  return NextResponse.json({}, { headers: getCorsHeaders(request) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      moduleName,
      problem_statement,
      solution,
      chat_history,
      features,
      userName,
    } = body;

    if (!userId || !moduleName || !userName) {
      return new NextResponse("Missing required fields", {
        status: 400,
        headers: getCorsHeaders(request),
      });
    }

    const newIdea = await createProjectIdea({
      user_id: userId,
      module_name: moduleName,
      problem_statement,
      solution,
      chat_history,
      features,
      user_name: userName,
    });
    return NextResponse.json(newIdea, {
      status: 201,
      headers: getCorsHeaders(request),
    });
  } catch (error) {
    console.error("[PROJECT_IDEAS_POST]", error);
    return new NextResponse("Internal Error", {
      status: 500,
      headers: getCorsHeaders(request),
    });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    let moduleName: string | undefined =
      searchParams.get("moduleName") || undefined;

    if (!userId) {
      return new NextResponse("Missing userId parameter", {
        status: 400,
        headers: getCorsHeaders(request),
      });
    }

    const ideas = await getProjectIdeasByUserId(userId, moduleName);
    return NextResponse.json(ideas, {
      status: 200,
      headers: getCorsHeaders(request),
    });
  } catch (error) {
    console.error("[PROJECT_IDEAS_GET]", error);
    return new NextResponse("Internal Error", {
      status: 500,
      headers: getCorsHeaders(request),
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
      userName,
    } = await req.json();

    if (!userId || !moduleName) {
      return NextResponse.json(
        { error: "User ID or Module Name is missing" },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }

    // Only proceed if chatHistory is not empty
    if (!chatHistory || chatHistory.length === 0) {
      return NextResponse.json(
        { error: "Chat history is empty, not saving." },
        { status: 200, headers: getCorsHeaders(req) }
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
        user_name: userName,
      });

      if (!updatedIdea) {
        return NextResponse.json(
          { error: "Failed to update project idea: No idea found or updated" },
          { status: 404, headers: getCorsHeaders(req) }
        );
      }
      return NextResponse.json(updatedIdea, {
        status: 200,
        headers: getCorsHeaders(req),
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
        user_name: userName,
      });
      return NextResponse.json(newIdea, {
        status: 201,
        headers: getCorsHeaders(req),
      });
    }
  } catch (error) {
    console.error("[PROJECT_IDEAS_PUT]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getCorsHeaders(req) }
    );
  }
}
