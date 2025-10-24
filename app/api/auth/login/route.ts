import { createClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(request: Request) {
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });

  try {
    const { email, password } = await request.json();
    const supabase = createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("id, password, name")
      .eq("email", email)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { message: "Invalid credentials", status: 401 },
        {
          status: 401,
          headers,
        }
      );
    }

    // Direct comparison since passwords are not hashed
    if (password !== data.password) {
      return NextResponse.json(
        { message: "Invalid credentials", status: 401 },
        {
          status: 401,
          headers,
        }
      );
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: data.id, email: email, name: data.name },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    return NextResponse.json(
      {
        message: "Login successful",
        status: 200,
        token,
        name: data.name,
        id: data.id,
      },
      {
        status: 200,
        headers,
      }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", status: 500 },
      {
        status: 500,
        headers,
      }
    );
  }
}

export async function OPTIONS() {
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  return new NextResponse(null, { status: 204, headers });
}
