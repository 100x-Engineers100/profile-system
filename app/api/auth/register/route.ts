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

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists", status: 409 }, {
        status: 409,
        headers,
      });
    }

    // Insert new user with plain text password
    const { data: newUser, error: insertError } = await supabase
      .from("profiles")
      .insert([{ email, password }])
      .select("id")
      .single();

    if (insertError || !newUser) {
      console.error("Registration error:", insertError);
      return NextResponse.json({ message: "Registration failed", status: 500 }, {
        status: 500,
        headers,
      });
    }

    // Generate JWT
    const token = jwt.sign({ userId: newUser.id, email: email }, process.env.JWT_SECRET!, { expiresIn: "1h" });

    return NextResponse.json({ message: "Registration successful", status: 201, token }, {
      status: 201,
      headers,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ message: "Internal Server Error", status: 500 }, {
      status: 500,
      headers,
    });
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