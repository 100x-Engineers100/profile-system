import { NextResponse } from "next/server";
import { getIkigaiBalanceByUserId, updateIkigaiBalance } from "@/lib/db/queries";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return new NextResponse("Missing userId parameter", { status: 400 });
    }

    const ikigaiBalance = await getIkigaiBalanceByUserId(userId);
    return new NextResponse(JSON.stringify({ ikigai_balance: ikigaiBalance }), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error("[IKIGAI_BALANCE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, amount } = body;

    if (!userId || amount === undefined) {
      return new NextResponse("Missing userId or amount parameter", { status: 400 });
    }

    await updateIkigaiBalance(userId, amount);
    return new NextResponse(JSON.stringify({ message: "Ikigai balance updated successfully" }), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error("[IKIGAI_BALANCE_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}