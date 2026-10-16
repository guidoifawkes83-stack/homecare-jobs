import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();

  if (
    process.env.NODE_ENV === "development" &&
    (!supabaseUrl || !supabaseAnonKey || !ownerEmail)
  ) {
    return NextResponse.next();
  }

  if (!supabaseUrl || !supabaseAnonKey || !ownerEmail) {
    if (request.nextUrl.pathname === "/login") {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  let response = NextResponse.next({ request });
  type CookieOptions = Parameters<typeof response.cookies.set>[2];
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: CookieOptions;
        }>,
      ) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isCallback = request.nextUrl.pathname.startsWith("/auth/callback");
  const isOwner = user?.email?.toLowerCase() === ownerEmail;

  if (error) {
    console.error("Supabase session validation failed:", error.message);
  }

  if (isCallback) {
    return response;
  }

  if (isLoginPage && isOwner) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isLoginPage && !isOwner) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
