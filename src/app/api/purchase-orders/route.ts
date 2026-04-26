import { PurchaseOrderStatus, UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { calculateTotals } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { purchaseOrderSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as PurchaseOrderStatus | null;

  const orders = await prisma.purchaseOrder.findMany({
    where: { status: status ?? undefined },
    include: {
      supplier: true,
      items: true,
      createdBy: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return ok(orders);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.MANAGER]);
    if (auth.error) return auth.error;

    const body = purchaseOrderSchema.parse(await request.json());
    const totals = calculateTotals(body.items);

    const order = await prisma.purchaseOrder.create({
      data: {
        code: `PO-${Date.now()}`,
        supplierId: body.supplierId,
        createdById: auth.user.id,
        status: body.status ?? PurchaseOrderStatus.ORDERED,
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
        notes: body.notes,
        subtotal: totals.subtotal,
        total: totals.total,
        items: {
          create: body.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            total: item.quantity * item.unitCost
          }))
        }
      },
      include: {
        supplier: true,
        items: true
      }
    });

    await createAuditLog({
      userId: auth.user.id,
      action: "CREATE",
      entity: "PurchaseOrder",
      entityId: order.id,
      metadata: body
    });

    return ok(order, 201);
  } catch (error) {
    return handleError(error);
  }
}
