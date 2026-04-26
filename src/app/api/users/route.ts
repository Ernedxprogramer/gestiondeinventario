import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.MANAGER]);
  if (auth.error) return auth.error;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { createdAt: "desc" }
  });

  return ok(users);
}
