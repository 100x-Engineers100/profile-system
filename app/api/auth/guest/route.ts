import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get("redirectTo") || "/";

  // In a real application, you would create a guest user in your database here.
  // For now, we'll just create a dummy session.
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "guest@example.com", // Replace with actual guest user creation logic
    password: "guestpassword", // Replace with actual guest user creation logic
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL(redirectTo, request.url));
}