import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { confirmSalesOrder } from "@/lib/inventory";

async function resolveParams(context: { params: Promise<{ id: string }> }) {
  return context.params;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]);
    if (auth.error) return auth.error;

    const { id } = await resolveParams(context);
    const order = await confirmSalesOrder({
      salesOrderId: id,
      userId: auth.user.id
    });

    await createAuditLog({
      userId: auth.user.id,
      action: "CONFIRM",
      entity: "SalesOrder",
      entityId: id
    });

    return ok(order);
  } catch (error) {
    return handleError(error);
  }
}
