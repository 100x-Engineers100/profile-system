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
  status?: "complete" | "ongoing";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      chat_history,
      status,
      chat_number, // Add chat_number to the destructuring
      ...ikigaiDetails
    }: {
      userId: string;
      chat_history?: ChatMessage[];
      status?: string;
      chat_number?: number; // Make it optional for new chats
    } & IkigaiData = body;

    if (!userId) {
      return new NextResponse("Missing userId", { status: 400 });
    }

    // Create the complete ikigai data object
    const completeIkigaiData = {
      ...ikigaiDetails,
      status: status || "complete",
    };

    let currentChatNumber: number;

    if (chat_number) {
      currentChatNumber = chat_number;
    } else {
      // If chat_number is not provided, it's a new chat
      const existingIkigaiData = await getUserIkigaiDataByUserId(userId);
      const existingChatNumbers = (existingIkigaiData || []).map(
        (data: any) => data.chat_number || 0
      );
      currentChatNumber =
        existingChatNumbers.length > 0
          ? Math.max(...existingChatNumbers) + 1
          : 1;
    }

    await createOrUpdateUserIkigaiData(
      userId,
      currentChatNumber,
      completeIkigaiData,
      chat_history || []
    );

    return new NextResponse(
      JSON.stringify({
        message: "Ikigai data saved successfully",
        chat_number: currentChatNumber, // Return the generated or provided chat_number
      }),
      {
        status: 201,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      }
    );
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
      return new Response("Unauthorized", { status: 401 });
    }

    const ikigaiDataList = await getUserIkigaiDataByUserId(userId); // This now returns an array

    if (!ikigaiDataList || ikigaiDataList.length === 0) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // The data is already structured as an array of conversation objects,
    // so no further grouping is needed.
    const responseData = ikigaiDataList.map((data: any) => ({
      ikigai_details: data.ikigai_details,
      chat_history: data.chat_history,
      chat_number: data.chat_number,
    }));

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
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

    return new NextResponse(
      JSON.stringify({ message: "Ikigai data deleted successfully" }),
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[IKIGAI_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
