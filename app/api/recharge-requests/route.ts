import { NextResponse } from "next/server";
import {
  getPendingRechargeRequests,
  createRechargeRequest,
  updateRechargeRequestStatus,
} from "@/lib/db/queries";

export async function GET(req: Request) {
  try {
    const requests = await getPendingRechargeRequests();

    return new NextResponse(JSON.stringify(requests), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[RECHARGE_REQUESTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { menteeId, amount, chatHistory, balanceType } = await req.json();

    if (!menteeId || !amount || !chatHistory || !balanceType) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const newRequest = await createRechargeRequest(
      menteeId,
      amount,
      chatHistory,
      balanceType
    );

    return new NextResponse(JSON.stringify(newRequest), {
      status: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[RECHARGE_REQUESTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, status, menteeId, amount, balanceType } = await req.json();

    if (!id || !status || !menteeId || !amount || !balanceType) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const updatedRequest = await updateRechargeRequestStatus(
      id,
      status,
      menteeId,
      amount,
      balanceType
    );

    return new NextResponse(JSON.stringify(updatedRequest), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[RECHARGE_REQUESTS_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
