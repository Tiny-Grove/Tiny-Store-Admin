import "server-only";
import type { NextRequest } from "next/server";

// Server-to-server auth for the mobile app's backend calling our ticket API.
// Not tied to a real user identity — it's service-level trust, so the
// caller is responsible for vouching for whichever customer email it sends.
export function isValidApiKey(request: NextRequest): boolean {
  const expected = process.env.TICKETS_API_KEY;
  if (!expected) return false;

  const header = request.headers.get("authorization");
  const provided = header?.startsWith("Bearer ") ? header.slice(7) : null;

  return !!provided && provided === expected;
}
