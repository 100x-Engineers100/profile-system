import { NextResponse } from "next/server";
import { createRoadmap, getRoadmapsByUserId } from "@/lib/db/queries";

const ALLOWED_ORIGINS = [
  "https://task-100x-quest.lovable.app",
  "https://profile-system.vercel.app",
  "https://100x-self-discovery.vercel.app",
  "http://localhost:3001",
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
    headers["Access-Control-Allow-Origin"] = "http://localhost:3001"; // Fallback or default
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
      sessionName,
      weekNumber,
      lectureNumber,
      moduleName,
      projectBasedMessage,
      outcomeBasedMessage,
    } = body;

    if (
      !userId ||
      !sessionName ||
      !weekNumber ||
      !lectureNumber ||
      !moduleName
    ) {
      return new NextResponse("Missing required fields", {
        status: 400,
        headers: getCorsHeaders(request),
      });
    }

    const newRoadmap = await createRoadmap({
      userId,
      sessionName,
      weekNumber,
      lectureNumber,
      moduleName,
      projectBasedMessage,
      outcomeBasedMessage,
    });
    return NextResponse.json(newRoadmap, {
      status: 201,
      headers: getCorsHeaders(request),
    });
  } catch (error) {
    console.error("[ROADMAPS_POST]", error);
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

    if (!userId) {
      return new NextResponse("Missing userId parameter", {
        status: 400,
        headers: getCorsHeaders(request),
      });
    }

    const roadmaps = await getRoadmapsByUserId(userId);
    return NextResponse.json(roadmaps, {
      status: 200,
      headers: getCorsHeaders(request),
    });
  } catch (error) {
    console.error("[ROADMAPS_GET]", error);
    return new NextResponse("Internal Error", {
      status: 500,
      headers: getCorsHeaders(request),
    });
  }
}
