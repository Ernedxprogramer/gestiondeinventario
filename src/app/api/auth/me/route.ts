import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  return ok(auth.user);
}
