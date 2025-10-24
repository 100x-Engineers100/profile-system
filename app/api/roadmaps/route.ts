import { NextResponse } from "next/server";
import { createRoadmap, getRoadmapsByUserId } from "@/lib/db/queries";

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:3001",
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
        headers: corsHeaders,
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
    return NextResponse.json(newRoadmap, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error("[ROADMAPS_POST]", error);
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

    if (!userId) {
      return new NextResponse("Missing userId parameter", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const roadmaps = await getRoadmapsByUserId(userId);
    return NextResponse.json(roadmaps, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("[ROADMAPS_GET]", error);
    return new NextResponse("Internal Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
}
