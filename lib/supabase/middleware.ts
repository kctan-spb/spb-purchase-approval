import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth", "/api/health"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase config we cannot authenticate: fail closed to the login page.
  const isPublic = PUBLIC_PATHS.some(
    (p) => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(p + "/"),
  );
  if (!url || !anonKey) {
    return isPublic ? response : NextResponse.redirect(new URL("/login", request.url));
  }

  let user = null;
  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });
    // Also refreshes the session so it doesn't expire while the user is active.
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  if (!user && !isPublic) {
    const login = new URL("/login", request.url);
    return NextResponse.redirect(login);
  }
  if (user && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}
