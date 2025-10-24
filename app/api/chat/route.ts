import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { userId, title, visibility } = await req.json();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Placeholder for chat creation logic
    const { data, error } = await supabase
      .from("chats")
      .insert([{ user_id: userId, title, visibility }])
      .select();

    if (error) {
      console.error("Error creating chat:", error);
      return NextResponse.json({ error: "Failed to create chat." }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error("Error in chat POST API:", error);
    return NextResponse.json(
      { error: "Failed to process request." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId");
    const limit = searchParams.get("limit");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("chats")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching chats:", error);
      return NextResponse.json({ error: "Failed to fetch chats." }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in chat GET API:", error);
    return NextResponse.json(
      { error: "Failed to process request." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("chats")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting chats:", error);
      return NextResponse.json({ error: "Failed to delete chats." }, { status: 500 });
    }

    return NextResponse.json({ message: "Chats deleted successfully." }, { status: 200 });
  } catch (error) {
    console.error("Error in chat DELETE API:", error);
    return NextResponse.json(
      { error: "Failed to process request." },
      { status: 500 }
    );
  }
}