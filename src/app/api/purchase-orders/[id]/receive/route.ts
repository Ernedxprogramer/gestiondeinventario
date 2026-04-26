import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { receivePurchaseOrder } from "@/lib/inventory";
import { receivePurchaseSchema } from "@/lib/validators";

async function resolveParams(context: { params: Promise<{ id: string }> }) {
  return context.params;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.MANAGER]);
    if (auth.error) return auth.error;

    const { id } = await resolveParams(context);
    const body = receivePurchaseSchema.parse(await request.json());

    const order = await receivePurchaseOrder({
      purchaseOrderId: id,
      receivedItems: body.items,
      userId: auth.user.id
    });

    await createAuditLog({
      userId: auth.user.id,
      action: "RECEIVE",
      entity: "PurchaseOrder",
      entityId: id,
      metadata: body
    });

    return ok(order);
  } catch (error) {
    return handleError(error);
  }
}
