import { MovementType, Prisma, PurchaseOrderStatus, SalesOrderStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function createInventoryMovement(tx: Prisma.TransactionClient, input: {
  productId: string;
  userId: string;
  type: MovementType;
  quantity: number;
  unitCost?: number | null;
  note?: string | null;
  reference?: string | null;
}) {
  return tx.inventoryMovement.create({
    data: {
      productId: input.productId,
      userId: input.userId,
      type: input.type,
      quantity: input.quantity,
      unitCost: input.unitCost ?? undefined,
      note: input.note,
      reference: input.reference
    }
  });
}

export async function adjustStock(input: {
  productId: string;
  quantityChange: number;
  userId: string;
  type: MovementType;
  note?: string | null;
  reference?: string | null;
  unitCost?: number | null;
}) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: input.productId }
    });

    if (!product) {
      throw new Error("Producto no encontrado");
    }

    const newStock = product.stock + input.quantityChange;
    if (newStock < 0) {
      throw new Error(`Stock insuficiente para ${product.name}`);
    }

    const updated = await tx.product.update({
      where: { id: input.productId },
      data: { stock: newStock }
    });

    await createInventoryMovement(tx, {
      productId: input.productId,
      userId: input.userId,
      type: input.type,
      quantity: Math.abs(input.quantityChange),
      note: input.note,
      reference: input.reference,
      unitCost: input.unitCost
    });

    return updated;
  });
}

export function calculateTotals<T extends { quantity: number; unitCost?: number; unitPrice?: number }>(items: T[]) {
  const subtotal = items.reduce((sum, item) => {
    const price = item.unitCost ?? item.unitPrice ?? 0;
    return sum + item.quantity * price;
  }, 0);

  return {
    subtotal,
    total: subtotal
  };
}

export async function receivePurchaseOrder(input: {
  purchaseOrderId: string;
  receivedItems: { itemId: string; receivedQty: number }[];
  userId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findUnique({
      where: { id: input.purchaseOrderId },
      include: { items: true }
    });

    if (!order) {
      throw new Error("Orden de compra no encontrada");
    }

    if (order.status === PurchaseOrderStatus.CANCELLED) {
      throw new Error("La orden de compra esta cancelada");
    }

    for (const entry of input.receivedItems) {
      const item = order.items.find((value) => value.id === entry.itemId);
      if (!item) {
        throw new Error("Item de orden de compra no encontrado");
      }

      const nextReceived = item.receivedQty + entry.receivedQty;
      if (nextReceived > item.quantity) {
        throw new Error("La cantidad recibida supera la cantidad pedida");
      }

      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { receivedQty: nextReceived }
      });

      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw new Error("Producto no encontrado");
      }

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: product.stock + entry.receivedQty }
      });

      await createInventoryMovement(tx, {
        productId: item.productId,
        userId: input.userId,
        type: MovementType.PURCHASE,
        quantity: entry.receivedQty,
        reference: order.code,
        unitCost: Number(item.unitCost),
        note: "Recepcion de orden de compra"
      });
    }

    const refreshedItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId: order.id }
    });
    const allReceived = refreshedItems.every((item) => item.receivedQty === item.quantity);
    const anyReceived = refreshedItems.some((item) => item.receivedQty > 0);

    return tx.purchaseOrder.update({
      where: { id: order.id },
      data: {
        status: allReceived
          ? PurchaseOrderStatus.RECEIVED
          : anyReceived
            ? PurchaseOrderStatus.PARTIALLY_RECEIVED
            : PurchaseOrderStatus.ORDERED
      },
      include: {
        items: true,
        supplier: true
      }
    });
  });
}

export async function confirmSalesOrder(input: {
  salesOrderId: string;
  userId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUnique({
      where: { id: input.salesOrderId },
      include: { items: true }
    });

    if (!order) {
      throw new Error("Orden de venta no encontrada");
    }

    if (order.status === SalesOrderStatus.CANCELLED) {
      throw new Error("La orden de venta esta cancelada");
    }

    if (order.status === SalesOrderStatus.CONFIRMED) {
      return order;
    }

    for (const item of order.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw new Error("Producto no encontrado");
      }

      if (product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para ${product.name}`);
      }

      await tx.product.update({
        where: { id: product.id },
        data: { stock: product.stock - item.quantity }
      });

      await createInventoryMovement(tx, {
        productId: product.id,
        userId: input.userId,
        type: MovementType.SALE,
        quantity: item.quantity,
        note: "Confirmacion de orden de venta",
        reference: order.code,
        unitCost: Number(item.unitPrice)
      });
    }

    return tx.salesOrder.update({
      where: { id: order.id },
      data: { status: SalesOrderStatus.CONFIRMED },
      include: {
        items: true,
        customer: true
      }
    });
  });
}
