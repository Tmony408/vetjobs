import { NextResponse } from "next/server";
import { getJobs } from "@/lib/source";

// Revalidate the live job feed every 5 minutes.
export const revalidate = 300;

export async function GET() {
  const jobs = await getJobs();
  return NextResponse.json({ jobs });
}
