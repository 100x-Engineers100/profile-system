import { NextResponse } from "next/server";
import { getProfilesByCohort } from "@/lib/db/queries";

const ALLOWED_ORIGINS = [
  "https://task-100x-quest.lovable.app",
  "https://profile-system.vercel.app",
  "https://100x-self-discovery.vercel.app",
];

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get("Origin");
  const headers: { [key: string]: string } = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else if (ALLOWED_ORIGINS.length === 0) {
    headers["Access-Control-Allow-Origin"] = "*";
  }

  return headers;
};

export async function OPTIONS(request: Request) {
  return NextResponse.json({}, { headers: getCorsHeaders(request) });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cohortName = searchParams.get("cohortName");

    if (!cohortName) {
      return new NextResponse("Missing cohortName parameter", {
        status: 400,
        headers: getCorsHeaders(request),
      });
    }

    const profiles = await getProfilesByCohort(cohortName);
    return NextResponse.json(profiles, {
      status: 200,
      headers: getCorsHeaders(request),
    });
  } catch (error) {
    console.error("[USERS_BY_COHORT_GET]", error);
    return new NextResponse("Internal Error", {
      status: 500,
      headers: getCorsHeaders(request),
    });
  }
}
