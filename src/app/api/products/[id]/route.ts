import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validators";

async function resolveParams(context: { params: Promise<{ id: string }> }) {
  return context.params;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const { id } = await resolveParams(context);
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      supplier: true,
      movements: {
        orderBy: { createdAt: "desc" },
        take: 20
      }
    }
  });

  return ok(product);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.MANAGER]);
    if (auth.error) return auth.error;

    const { id } = await resolveParams(context);
    const body = productSchema.partial().parse(await request.json());
    if (body.stock !== undefined) {
      throw new Error("El stock no se actualiza desde este endpoint. Usa /api/inventory/adjustments.");
    }

    const product = await prisma.product.update({
      where: { id },
      data: body,
      include: {
        category: true,
        supplier: true
      }
    });

    await createAuditLog({
      userId: auth.user.id,
      action: "UPDATE",
      entity: "Product",
      entityId: id,
      metadata: body
    });

    return ok(product);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN]);
    if (auth.error) return auth.error;

    const { id } = await resolveParams(context);
    await prisma.product.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      action: "DELETE",
      entity: "Product",
      entityId: id
    });

    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
