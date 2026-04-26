import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validators";

async function resolveParams(context: { params: Promise<{ id: string }> }) {
  return context.params;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const { id } = await resolveParams(context);
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { salesOrders: true }
  });

  return ok(customer);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]);
    if (auth.error) return auth.error;

    const { id } = await resolveParams(context);
    const body = customerSchema.partial().parse(await request.json());
    const customer = await prisma.customer.update({
      where: { id },
      data: body
    });

    await createAuditLog({
      userId: auth.user.id,
      action: "UPDATE",
      entity: "Customer",
      entityId: id,
      metadata: body
    });

    return ok(customer);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.MANAGER]);
    if (auth.error) return auth.error;

    const { id } = await resolveParams(context);
    await prisma.customer.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      action: "DELETE",
      entity: "Customer",
      entityId: id
    });

    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
