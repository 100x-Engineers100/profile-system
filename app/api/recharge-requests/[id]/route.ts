import { NextResponse } from "next/server";
import { updateRechargeRequestStatus } from "@/lib/db/queries";
import { auth } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { status } = await req.json();

    if (!status || (status !== "approved" && status !== "rejected")) {
      return new NextResponse("Invalid status", { status: 400 });
    }

    const updatedRequest = await updateRechargeRequestStatus(params.id, status);

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("[RECHARGE_REQUEST_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
