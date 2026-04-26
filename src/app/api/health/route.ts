import { ok } from "@/lib/api";

export async function GET() {
  return ok({
    service: "inventory-gestion-api",
    status: "ok",
    timestamp: new Date().toISOString()
  });
}
