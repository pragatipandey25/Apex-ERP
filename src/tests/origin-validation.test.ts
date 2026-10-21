import { describe, it, expect } from "vitest";
import { validateRequestOrigin, AuthError } from "../lib/permissions";
import { NextRequest } from "next/server";

describe("CSRF Origin & Referer Validation", () => {
  function createMockRequest(method: string, headers: Record<string, string>): NextRequest {
    return new NextRequest("http://localhost:3000/api/orders", {
      method,
      headers: new Headers(headers),
    });
  }

  it("permits safe read-only methods (GET) without origin checks", () => {
    const req = createMockRequest("GET", {
      origin: "http://attacker.example",
      host: "localhost:3000",
    });
    expect(() => validateRequestOrigin(req)).not.toThrow();
  });

  it("permits legitimate same-origin POST requests", () => {
    const req = createMockRequest("POST", {
      origin: "http://localhost:3000",
      host: "localhost:3000",
    });
    expect(() => validateRequestOrigin(req)).not.toThrow();
  });

  it("permits 127.0.0.1 local development origin", () => {
    const req = createMockRequest("POST", {
      origin: "http://127.0.0.1:3000",
      host: "localhost:3000",
    });
    expect(() => validateRequestOrigin(req)).not.toThrow();
  });

  it("rejects untrusted cross-site Origin with HTTP 403", () => {
    const req = createMockRequest("POST", {
      origin: "https://evil-phishing.example",
      host: "localhost:3000",
    });
    expect(() => validateRequestOrigin(req)).toThrowError(
      expect.objectContaining({
        statusCode: 403,
        name: "AuthError",
      })
    );
  });

  it("rejects malformed Origin header with HTTP 403", () => {
    const req = createMockRequest("POST", {
      origin: "not-a-valid-url",
      host: "localhost:3000",
    });
    expect(() => validateRequestOrigin(req)).toThrowError(
      expect.objectContaining({
        statusCode: 403,
      })
    );
  });

  it("falls back to Referer and permits legitimate same-origin Referer", () => {
    const req = createMockRequest("POST", {
      referer: "http://localhost:3000/orders",
      host: "localhost:3000",
    });
    expect(() => validateRequestOrigin(req)).not.toThrow();
  });

  it("rejects cross-site Referer with HTTP 403", () => {
    const req = createMockRequest("POST", {
      referer: "https://attacker.example/exploit.html",
      host: "localhost:3000",
    });
    expect(() => validateRequestOrigin(req)).toThrowError(
      expect.objectContaining({
        statusCode: 403,
      })
    );
  });

  it("rejects requests with Sec-Fetch-Site: cross-site even if Origin is stripped", () => {
    const req = createMockRequest("POST", {
      "sec-fetch-site": "cross-site",
      host: "localhost:3000",
    });
    expect(() => validateRequestOrigin(req)).toThrowError(
      expect.objectContaining({
        statusCode: 403,
      })
    );
  });
});
