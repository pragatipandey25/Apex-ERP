import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations";
import { verifyPassword, createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rate-limiter";
import { validateRequestOrigin, handleApiError } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    validateRequestOrigin(req);

    const ip = req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    // Rate limiting check
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed login attempts. Please try again in ${rateCheck.retryAfterSec} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid login credentials format.",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;

    // Find user by normalized email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Reset rate limiter on successful auth
    resetRateLimit(ip);

    // Create session and set HttpOnly cookie
    await createSession(user.id, ip, userAgent);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);

    // Provide clear, actionable diagnostics if database server is unreachable
    if (
      error?.code === "P1001" ||
      error?.message?.includes("Can't reach database server") ||
      error?.message?.includes("connect ECONNREFUSED")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Database connection failed: Cannot reach MySQL server at localhost:3306. Please ensure MySQL is running, or configure DATABASE_URL in your .env file.",
          dbError: true,
        },
        { status: 503 }
      );
    }

    if (error?.code === "P2021" || error?.message?.includes("does not exist")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Database schema not initialized: Tables do not exist. Please run 'npx prisma db push && npm run seed'.",
          dbError: true,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: error?.message || "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
