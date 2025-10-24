import { NextResponse } from "next/server";
import { getProfilesByCohort } from "@/lib/db/queries";

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:8080",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cohortName = searchParams.get("cohortName");

    if (!cohortName) {
      return new NextResponse("Missing cohortName parameter", { status: 400, headers: corsHeaders });
    }

    const profiles = await getProfilesByCohort(cohortName);
    return NextResponse.json(profiles, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("[USERS_BY_COHORT_GET]", error);
    return new NextResponse("Internal Error", { status: 500, headers: corsHeaders });
  }
}