import { NextResponse } from "next/server";
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
 * Validates that the request has an active authenticated session.
 * Throws AuthError(401) if not logged in.
 */
export async function authenticateUser(): Promise<SessionUser> {
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
