import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supplierSchema } from "@/lib/validators";

async function resolveParams(context: { params: Promise<{ id: string }> }) {
  return context.params;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const { id } = await resolveParams(context);
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      products: true,
      purchaseOrders: true
    }
  });

  return ok(supplier);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.MANAGER]);
    if (auth.error) return auth.error;

    const { id } = await resolveParams(context);
    const body = supplierSchema.partial().parse(await request.json());
    const supplier = await prisma.supplier.update({
      where: { id },
      data: body
    });

    await createAuditLog({
      userId: auth.user.id,
      action: "UPDATE",
      entity: "Supplier",
      entityId: id,
      metadata: body
    });

    return ok(supplier);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN]);
    if (auth.error) return auth.error;

    const { id } = await resolveParams(context);
    await prisma.supplier.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      action: "DELETE",
      entity: "Supplier",
      entityId: id
    });

    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
