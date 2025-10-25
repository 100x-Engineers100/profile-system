import { NextRequest, NextResponse } from "next/server";
import { updateRechargeRequestStatus } from "@/lib/db/queries";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { status, menteeId, amount, balanceType } = await req.json();

    if (!status || (status !== "approved" && status !== "rejected")) {
      return new NextResponse("Invalid status", { status: 400 });
    }

    if (!menteeId || !amount || !balanceType) {
      return new NextResponse("Missing menteeId, amount, or balanceType", {
        status: 400,
      });
    }

    const updatedRequest = await updateRechargeRequestStatus(
      id,
      status,
      menteeId,
      amount,
      balanceType
    );

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("[RECHARGE_REQUEST_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
