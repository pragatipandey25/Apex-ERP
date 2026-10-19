import { describe, it, expect } from "vitest";
import { authorizeRole, AuthError } from "../lib/permissions";
import { hashPassword, verifyPassword, SessionUser } from "../lib/auth";
import { Role } from "@prisma/client";

describe("Authentication & Role Authorization Security", () => {
  const staffUser: SessionUser = {
    id: "user_staff_1",
    email: "staff@apexdemo.local",
    name: "Staff Operator",
    role: Role.STAFF,
  };

  const adminUser: SessionUser = {
    id: "user_admin_1",
    email: "admin@apexdemo.local",
    name: "System Administrator",
    role: Role.ADMIN,
  };

  it("permits Admin to access Admin-only endpoints", () => {
    expect(() => authorizeRole(adminUser, [Role.ADMIN])).not.toThrow();
  });

  it("strictly throws HTTP 403 AuthError when Staff attempts an Admin action", () => {
    expect(() => authorizeRole(staffUser, [Role.ADMIN])).toThrowError(
      expect.objectContaining({
        statusCode: 403,
        name: "AuthError",
      })
    );
  });

  it("permits both Staff and Admin to access operational endpoints", () => {
    expect(() => authorizeRole(staffUser, [Role.STAFF, Role.ADMIN])).not.toThrow();
    expect(() => authorizeRole(adminUser, [Role.STAFF, Role.ADMIN])).not.toThrow();
  });

  it("hashes passwords securely with bcrypt and verifies correctly", async () => {
    const plaintext = "Admin@ApexTape2026!";
    const hashed = await hashPassword(plaintext);

    expect(hashed).not.toBe(plaintext);
    expect(hashed.startsWith("$2a$") || hashed.startsWith("$2b$")).toBe(true);

    const matches = await verifyPassword(plaintext, hashed);
    expect(matches).toBe(true);

    const wrongMatches = await verifyPassword("WrongPassword123!", hashed);
    expect(wrongMatches).toBe(false);
  });
});
