import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, SessionUser } from "./auth";
import { Role } from "@prisma/client";

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Validates Origin and Referer headers on state-changing requests (POST, PUT, PATCH, DELETE)
 * with exact trusted-origin matching. Rejects cross-site requests with HTTP 403 Forbidden.
 */
export function validateRequestOrigin(req: NextRequest): void {
  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return; // Safe read-only methods
  }

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host") || "localhost:3000";

  const trustedHosts = new Set<string>([
    host.toLowerCase(),
    "localhost:3000",
    "127.0.0.1:3000",
  ]);

  if (process.env.APP_URL) {
    try {
      trustedHosts.add(new URL(process.env.APP_URL).host.toLowerCase());
    } catch {}
  }

  // 1. Check Origin header if present
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (!trustedHosts.has(originUrl.host.toLowerCase())) {
        throw new AuthError(
          `Forbidden: Cross-site request rejected. Origin '${origin}' is not a trusted origin.`,
          403
        );
      }
      return;
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError("Forbidden: Malformed Origin header.", 403);
    }
  }

  // 2. Check Referer header if Origin is absent
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (!trustedHosts.has(refererUrl.host.toLowerCase())) {
        throw new AuthError(
          `Forbidden: Cross-site request rejected. Referer '${referer}' is not a trusted source.`,
          403
        );
      }
      return;
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError("Forbidden: Malformed Referer header.", 403);
    }
  }

  // 3. Fallback: Check Sec-Fetch-Site if headers were stripped
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    throw new AuthError("Forbidden: Cross-site request rejected via Sec-Fetch-Site.", 403);
  }
}

/**
 * Validates that the request has an active authenticated session.
 * Optionally validates request origin on state-changing requests if req is supplied.
 * Throws AuthError(401) if not logged in.
 */
export async function authenticateUser(req?: NextRequest): Promise<SessionUser> {
  if (req) {
    validateRequestOrigin(req);
  }
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Authentication required. Please log in.", 401);
  }
  return user;
}

/**
 * Ensures the authenticated user possesses one of the allowed roles.
 * Throws AuthError(403) if role is insufficient.
 */
export function authorizeRole(user: SessionUser, allowedRoles: Role[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new AuthError(
      `Forbidden: User role '${user.role}' lacks permission for this action. Required: ${allowedRoles.join(
        ", "
      )}`,
      403
    );
  }
}

/**
 * Helper to handle errors in route handlers safely without exposing stack traces.
 */
export function handleApiError(error: unknown) {
  console.error("API Error:", error);

  if (error instanceof AuthError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.statusCode }
    );
  }

  const errObj = error as any;
  if (
    errObj?.code === "P1001" ||
    errObj?.message?.includes("Can't reach database server") ||
    errObj?.message?.includes("connect ECONNREFUSED")
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Database connection error: Cannot reach MySQL server at localhost:3306. Please ensure MySQL is running, or verify DATABASE_URL in .env.",
      },
      { status: 503 }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { success: false, error: "An unexpected internal server error occurred." },
    { status: 500 }
  );
}
