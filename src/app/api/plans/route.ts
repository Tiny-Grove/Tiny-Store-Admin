import { NextResponse } from "next/server";
import { getEnabledPlansPublic } from "@/lib/stripe-plans";

// Public, read-only catalog endpoint — the customer-facing website and its
// enrollment/sign-up flow call this so only plans enabled on the admin
// Subscriptions page ever appear as options, whether displayed on the site
// or offered when someone enrolls for an account. No auth: this is the same
// pricing information a visitor could see on a pricing page, and returns
// nothing customer-specific. CORS is open since it's meant to be called
// cross-origin from that separate site.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function GET() {
  const plans = await getEnabledPlansPublic();

  return NextResponse.json(
    { plans },
    {
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
