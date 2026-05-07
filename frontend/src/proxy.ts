import { NextResponse, type NextRequest } from "next/server";

const publicPaths = [
  "/auth/login",
  "/auth/register",
  "/auth/verify-email",
  "/auth/forgot-password",
  "/auth/reset-password",
];

const superAdminPublicPaths = ["/super-admin/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.get("hasSession")?.value === "1";
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
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
