import { NextResponse } from "next/server";
import {
  createOrUpdateUserIkigaiData,
  getUserIkigaiDataByUserId,
  deleteUserIkigaiDataByUserId,
} from "@/lib/db/queries";

interface ChatMessage {
  role: string;
  content: string;
  chat_history?: ChatMessage[];
}

interface IkigaiData {
  what_you_love: string;
  what_you_are_good_at: string;
  what_world_needs: string;
  what_you_can_be_paid_for: string;
  your_ikigai: string;
  explanation: string;
  next_steps: string;
  status?: "complete" | "incomplete";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      chat_history,
      status,
      ...ikigaiDetails
    }: {
      userId: string;
      chat_history?: ChatMessage[];
      status?: string;
    } & IkigaiData = body;

    if (!userId) {
      return new NextResponse("Missing userId", { status: 400 });
    }

    // Create the complete ikigai data object
    const completeIkigaiData = {
      ...ikigaiDetails,
      status: status || "complete",
    };

    await createOrUpdateUserIkigaiData(
      userId,
      completeIkigaiData,
      chat_history || []
    );

    return new NextResponse(JSON.stringify({ message: "Ikigai data saved successfully" }), {
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error("[IKIGAI_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return new NextResponse("Missing userId parameter", { status: 400 });
    }

    const result = await getUserIkigaiDataByUserId(userId);

    if (!result) {
      return new NextResponse(JSON.stringify({ ikigai_details: null, chat_history: [] }), {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    const { ikigai_details, chat_history } = result;

    return new NextResponse(JSON.stringify({ ikigai_details, chat_history }), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error("[IKIGAI_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return new NextResponse("Missing userId parameter", { status: 400 });
    }

    await deleteUserIkigaiDataByUserId(userId);

    return new NextResponse(JSON.stringify({ message: "Ikigai data deleted successfully" }), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error("[IKIGAI_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
