import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.MANAGER]);
  if (auth.error) return auth.error;

  const logs = await prisma.auditLog.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return ok(logs);
}
