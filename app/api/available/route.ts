import { NextResponse } from "next/server";
import { isAvailable, slugProblem } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const slug = (new URL(req.url).searchParams.get("slug") ?? "").trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ available: false, problem: "Pick a name." });
  }
  const problem = slugProblem(slug);
  if (problem) {
    return NextResponse.json({ available: false, problem });
  }
  const available = await isAvailable(slug);
  return NextResponse.json({
    available,
    problem: available ? null : "That name is already claimed.",
  });
}
