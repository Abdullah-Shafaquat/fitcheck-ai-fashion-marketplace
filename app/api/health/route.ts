import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Safe readiness endpoint.
 *
 * Returns only operational information (status + service health + timestamp).
 * Never returns environment variables, credentials, connection strings or
 * internal stack details. Intended for load balancers / uptime monitors /
 * orchestrators to decide readiness.
 */
export async function GET(req: NextRequest) {
  const started = Date.now();
  let database = "ok" as "ok" | "error" | "unknown";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }

  const healthy = database === "ok";
  const ms = Date.now() - started;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      services: { database },
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      responseTimeMs: ms,
    },
    { status: healthy ? 200 : 503 }
  );
}
