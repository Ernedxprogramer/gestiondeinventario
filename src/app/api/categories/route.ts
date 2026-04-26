import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { products: true }
      }
    },
    orderBy: { name: "asc" }
  });

  return ok(categories);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.MANAGER]);
    if (auth.error) return auth.error;

    const body = categorySchema.parse(await request.json());
    const category = await prisma.category.create({ data: body });

    await createAuditLog({
      userId: auth.user.id,
      action: "CREATE",
      entity: "Category",
      entityId: category.id,
      metadata: body
    });

    return ok(category, 201);
  } catch (error) {
    return handleError(error);
  }
}
