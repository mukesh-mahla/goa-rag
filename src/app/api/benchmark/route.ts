import { NextRequest, NextResponse } from "next/server";
import { runTsBenchmark } from "@/app/lib/benchmark";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const report = await runTsBenchmark();
    return NextResponse.json(report);
  } catch (error: any) {
    console.error("Benchmark route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute TypeScript benchmark suite." },
      { status: 500 }
    );
  }
}
