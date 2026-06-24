import { NextResponse } from "next/server";
import { getJobs } from "@/lib/source";

// Cache the job feed and only refresh every 30 minutes. This protects free-tier
// source quotas (e.g. JSearch) — upstream APIs are hit at most once per window,
// not on every page load.
export const dynamic = "force-static";
export const revalidate = 1800;

export async function GET() {
  const jobs = await getJobs();
  return NextResponse.json({ jobs });
}
