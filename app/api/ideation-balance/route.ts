import {
  getUserIdeationBalance,
  updateUserIdeationBalance,
} from "@/lib/db/queries";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const balanceType = searchParams.get("balanceType");

  if (!userId || !balanceType) {
    return new Response("Missing userId or balanceType", { status: 400 });
  }

  try {
    const ideation_balance = await getUserIdeationBalance(userId, balanceType);
    return new Response(JSON.stringify({ ideation_balance }), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error("Error fetching ideation balance:", error);
    return new Response("Error fetching ideation balance", {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function PUT(req: Request) {
  const { userId, amount, balanceType } = await req.json();

  if (!userId || amount === undefined || !balanceType) {
    return new Response("Missing userId, amount, or balanceType", {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    await updateUserIdeationBalance(userId, amount, balanceType);
    return new Response(
      JSON.stringify({ message: "Ideation balance updated successfully" }),
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    console.error("Error updating ideation balance:", error);
    return new Response("Error updating ideation balance", {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  });
}
