import { NextResponse } from "next/server";
import { updateProjectIdeaStatus } from "@/lib/db/queries";
import { auth } from "@/lib/auth";

const allowedOrigins = ["http://localhost:3001", "http://localhost:8080"];

export async function PUT(req: Request) {
  const origin = req.headers.get("origin");

  if (origin && !allowedOrigins.includes(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  try {
    const { id, isAccepted } = await req.json();

    if (!id || typeof isAccepted !== "boolean") {
      return new NextResponse("Missing required fields: id and isAccepted", {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": origin || "",
        },
      });
    }

    const updatedIdea = await updateProjectIdeaStatus(id, isAccepted);

    return NextResponse.json(updatedIdea, {
      headers: {
        "Access-Control-Allow-Origin": origin || "",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[PROJECT_APPROVALS_UPDATE_PUT]", error);
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
