import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  // In a real application, you would fetch the message from your database
  // using the provided 'id'. For now, we'll return a mock message object.
  const mockMessage = {
    id: id,
    chatId: "mockChatId", // Replace with actual chat ID logic
    content: `Mock message content for ID ${id}`,
    role: "user",
    createdAt: new Date().toISOString(),
    is_real_message: false,
  };

  // Basic authentication check (replace with your actual auth logic)
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.json([mockMessage]);
}