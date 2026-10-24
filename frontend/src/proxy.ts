import { NextResponse, type NextRequest } from "next/server";

const publicPaths = [
  "/auth/login",
  "/auth/register",
  "/auth/verify-email",
  "/auth/forgot-password",
  "/auth/reset-password",
];

// Session hand-off after "Continue with Google": reachable with or without a session hint
// (it creates the session, and must not be bounced to /dashboard by a stale hint).
const sessionHandoffPaths = ["/auth/google/complete"];

// Login-free token pages: /wa/<token> (reconnect WhatsApp from the phone), /p/<token> (a client's proposal)
const openPrefixes = ["/wa/", "/p/"];

const superAdminPublicPaths = ["/super-admin/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // "1" = session, "r" = remembered session (see stores/auth-store.ts)
  const sessionHint = request.cookies.get("hasSession")?.value;
  const hasSession = sessionHint === "1" || sessionHint === "r";
  const hasSuperAdminSession = request.cookies.get("hasSuperAdminSession")?.value === "1";

  // Super admin routes — separate session cookie
  if (pathname.startsWith("/super-admin")) {
    const isPublic = superAdminPublicPaths.includes(pathname);
    if (isPublic && hasSuperAdminSession) {
      return NextResponse.redirect(new URL("/super-admin/dashboard", request.url));
    }
    if (!isPublic && !hasSuperAdminSession) {
      return NextResponse.redirect(new URL("/super-admin/login", request.url));
    }
    return NextResponse.next();
  }

  if (sessionHandoffPaths.includes(pathname)) return NextResponse.next();
  if (openPrefixes.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  // Authenticated user trying to access auth pages → redirect to dashboard
  if (isPublic && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Unauthenticated user trying to access protected pages → redirect to login
  if (!isPublic && !hasSession && pathname !== "/") {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // sw.js: browsers refuse a redirected service worker script
    "/((?!_next/static|_next/image|favicon.ico|favicon.png|logo|api|sw.js).*)",
  ],
};
