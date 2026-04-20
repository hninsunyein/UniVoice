import { NextRequest, NextResponse } from "next/server";

/** Route prefix → roles allowed to access it */
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/admin":            ["SUPER_ADMIN", "ADMIN"],
  "/user/student":     ["STUDENT"],
  "/user/coordinator": ["MARKETING_COORDINATOR"],
  "/user/manager":     ["MARKETING_MANAGER"],
  "/user/guest":       ["GUEST"],
  "/magazine":         ["GUEST", "MARKETING_COORDINATOR", "MARKETING_MANAGER", "SUPER_ADMIN", "ADMIN"],
};

/** Exact paths that never require authentication */
const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/admin/login",
  "/forgot-password",
  "/change-password",
  "/email",
  "/403",
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public routes
  if (PUBLIC_ROUTES.has(pathname)) return NextResponse.next();

  // Find the protected prefix this path falls under
  const matchedPrefix = Object.keys(ROUTE_PERMISSIONS).find((prefix) =>
    pathname.startsWith(prefix)
  );

  // No protected prefix matched — let Next.js handle it
  if (!matchedPrefix) return NextResponse.next();

  const role = request.cookies.get("univoice_role")?.value?.toUpperCase() ?? "";

  // No auth cookie → redirect to appropriate login
  if (!role) {
    const loginPath = pathname.startsWith("/admin") ? "/admin/login" : "/login";
    const url = new URL(loginPath, request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Wrong role → 403
  const allowedRoles = ROUTE_PERMISSIONS[matchedPrefix];
  if (!allowedRoles.includes(role)) {
    return NextResponse.redirect(new URL("/403", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
