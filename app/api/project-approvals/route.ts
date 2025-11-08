import { NextResponse } from "next/server";
import { getPendingProjectIdeas } from "@/lib/db/queries";

const allowedOrigins = [
  "https://task-100x-quest.lovable.app",
  "https://profile-system.vercel.app",
  "https://100x-self-discovery.vercel.app",
  "https://self-discovery.100xengineers.com",
  "http://localhost:3001",
  "http://localhost:8080",
];

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const url = new URL(req.url);
  const cohortName = url.searchParams.get("cohortName");

  if (origin && !allowedOrigins.includes(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  try {
    const projectIdeas = await getPendingProjectIdeas(cohortName || undefined);

    return NextResponse.json(projectIdeas, {
      headers: {
        "Access-Control-Allow-Origin": origin || "",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[PROJECT_APPROVALS_GET]", error);
    return new NextResponse("Internal Error", {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": origin || "",
      },
    });
  }
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");

  if (origin && !allowedOrigins.includes(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin || "",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
