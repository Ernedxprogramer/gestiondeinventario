import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function resolveParams(context: { params: Promise<{ id: string }> }) {
  return context.params;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const { id } = await resolveParams(context);
  const order = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          product: true
        }
      },
      createdBy: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  return ok(order);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.MANAGER]);
    if (auth.error) return auth.error;

    const { id } = await resolveParams(context);
    await prisma.salesOrder.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      action: "DELETE",
      entity: "SalesOrder",
      entityId: id
    });

    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
