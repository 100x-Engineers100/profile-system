import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Mock data for now
  const hasGeneratedRoadmap = false;

  return NextResponse.json({ hasGeneratedRoadmap });
}