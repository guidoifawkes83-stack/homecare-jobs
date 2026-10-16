"use server";

import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error?: string;
  success?: string;
};

export async function requestSignIn(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const emailEntry = formData.get("email");
  const email = typeof emailEntry === "string" ? emailEntry.trim() : "";
  const ownerEmail = process.env.OWNER_EMAIL?.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  if (!ownerEmail) {
    return {
      error: "Sign-in is not configured yet. Set OWNER_EMAIL in your local environment.",
    };
  }

  if (email.toLowerCase() !== ownerEmail.toLowerCase()) {
    return { error: "This email is not authorized for this private workspace." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      error: "Supabase is not configured yet. Add the URL and anon key to your local environment.",
    };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: new URL("/auth/callback", siteUrl).toString(),
      shouldCreateUser: false,
    },
  });

  if (error) {
    return { error: `Could not send the sign-in link: ${error.message}` };
  }

  return { success: "Check your inbox for a secure sign-in link." };
}
