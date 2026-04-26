import { SalesOrderStatus, UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { calculateTotals, confirmSalesOrder } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { salesOrderSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as SalesOrderStatus | null;

  const orders = await prisma.salesOrder.findMany({
    where: { status: status ?? undefined },
    include: {
      customer: true,
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
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]);
    if (auth.error) return auth.error;

    const body = salesOrderSchema.parse(await request.json());
    const catalog = await prisma.product.findMany({
      where: {
        id: { in: body.items.map((item) => item.productId) }
      }
    });

    const enrichedItems = body.items.map((item) => {
      const product = catalog.find((value) => value.id === item.productId);
      if (!product) {
        throw new Error("Producto no encontrado en la orden de venta");
      }

      return {
        ...item,
        unitPrice: item.unitPrice ?? Number(product.salePrice)
      };
    });

    const totals = calculateTotals(enrichedItems);
    const requestedStatus = body.status ?? SalesOrderStatus.DRAFT;
    const draft = await prisma.salesOrder.create({
      data: {
        code: `SO-${Date.now()}`,
        customerId: body.customerId,
        createdById: auth.user.id,
        status: requestedStatus === SalesOrderStatus.CONFIRMED ? SalesOrderStatus.DRAFT : requestedStatus,
        notes: body.notes,
        subtotal: totals.subtotal,
        total: totals.total,
        items: {
          create: enrichedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice
          }))
        }
      },
      include: {
        customer: true,
        items: true
      }
    });

    const order =
      requestedStatus === SalesOrderStatus.CONFIRMED
        ? await confirmSalesOrder({
            salesOrderId: draft.id,
            userId: auth.user.id
          })
        : draft;

    await createAuditLog({
      userId: auth.user.id,
      action: "CREATE",
      entity: "SalesOrder",
      entityId: draft.id,
      metadata: body
    });

    return ok(order, 201);
  } catch (error) {
    return handleError(error);
  }
}
