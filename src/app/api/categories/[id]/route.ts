import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validators";

async function resolveParams(context: { params: Promise<{ id: string }> }) {
  return context.params;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const { id } = await resolveParams(context);
  const category = await prisma.category.findUnique({
    where: { id },
    include: { products: true }
  });

  return ok(category);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.MANAGER]);
    if (auth.error) return auth.error;

    const { id } = await resolveParams(context);
    const body = categorySchema.partial().parse(await request.json());
    const category = await prisma.category.update({
      where: { id },
      data: body
    });

    await createAuditLog({
      userId: auth.user.id,
      action: "UPDATE",
      entity: "Category",
      entityId: id,
      metadata: body
    });

    return ok(category);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN]);
    if (auth.error) return auth.error;

    const { id } = await resolveParams(context);
    await prisma.category.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      action: "DELETE",
      entity: "Category",
      entityId: id
    });

    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
