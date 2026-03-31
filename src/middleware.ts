import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "mh_session";

// 시스템 경로 (동적 [code] 라우트와 충돌 방지)
const SYSTEM_PATHS = ["/super-admin", "/api", "/_next", "/favicon.ico"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;

  // 슈퍼 관리자 라우트 보호
  if (pathname.startsWith("/super-admin") && !pathname.startsWith("/super-admin/login")) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/super-admin/login", request.url));
    }

    // Verify the session actually belongs to a super_admin.
    // Without this check, any authenticated user (including regular site
    // owners) could access the super admin UI pages.
    try {
      const verifyUrl = new URL("/api/auth/me", request.url);
      const verifyRes = await fetch(verifyUrl, {
        headers: { cookie: `${COOKIE_NAME}=${sessionCookie}` },
      });

      if (!verifyRes.ok) {
        return NextResponse.redirect(new URL("/super-admin/login", request.url));
      }

      const data = await verifyRes.json();
      if (data?.data?.user?.userType !== "super_admin") {
        return NextResponse.redirect(new URL("/super-admin/login", request.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/super-admin/login", request.url));
    }
  }

  // 고객 관리자 라우트 보호: /{code}/admin (시스템 경로 제외)
  if (!SYSTEM_PATHS.some((p) => pathname.startsWith(p))) {
    const adminMatch = pathname.match(/^\/([^/]+)\/admin(?!\/login)/);
    if (adminMatch) {
      const urlCode = adminMatch[1];

      if (!sessionCookie) {
        return NextResponse.redirect(
          new URL(`/${urlCode}/admin/login`, request.url)
        );
      }

      // Verify the logged-in user's code matches the URL code.
      // Decode the session via an internal API call to avoid importing
      // Prisma (which cannot run in Edge middleware).
      try {
        const verifyUrl = new URL("/api/auth/me", request.url);
        const verifyRes = await fetch(verifyUrl, {
          headers: { cookie: `${COOKIE_NAME}=${sessionCookie}` },
        });

        if (!verifyRes.ok) {
          return NextResponse.redirect(
            new URL(`/${urlCode}/admin/login`, request.url)
          );
        }

        const data = await verifyRes.json();
        const sessionUser = data?.data?.user;

        // Super admins may access any admin panel; regular users
        // must match the URL code exactly.
        if (
          sessionUser?.userType !== "super_admin" &&
          sessionUser?.code !== urlCode
        ) {
          // Redirect to the login page of the URL they tried to access.
          // Clear any confusion — they are not authorized for this site.
          return NextResponse.redirect(
            new URL(`/${urlCode}/admin/login`, request.url)
          );
        }
      } catch {
        // If session verification fails for any reason, deny access.
        return NextResponse.redirect(
          new URL(`/${urlCode}/admin/login`, request.url)
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/super-admin/:path*", "/:code/admin/:path*"],
};
