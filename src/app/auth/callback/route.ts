import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=sign_in_failed", request.url));
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !ownerEmail || user.email?.toLowerCase() !== ownerEmail) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=not_authorized", request.url));
  }

  return NextResponse.redirect(new URL("/", request.url));
}
