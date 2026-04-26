import { NextRequest } from "next/server";

import { ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const [
    totalProducts,
    totalCategories,
    totalSuppliers,
    totalCustomers,
    totalStockUnits,
    inventoryValueList,
    salesCount,
    purchaseCount,
    lowStockProducts
  ] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.supplier.count(),
    prisma.customer.count(),
    prisma.product.aggregate({ _sum: { stock: true } }),
    prisma.product.findMany({
      select: {
        stock: true,
        costPrice: true
      }
    }),
    prisma.salesOrder.count(),
    prisma.purchaseOrder.count(),
    prisma.product.findMany({
      where: {
        minStock: { gt: 0 }
      },
      orderBy: { stock: "asc" },
      take: 10
    })
  ]);

  const critical = lowStockProducts.filter((product) => product.stock <= product.minStock);

  return ok({
    totalProducts,
    totalCategories,
    totalSuppliers,
    totalCustomers,
    totalStockUnits: totalStockUnits._sum.stock ?? 0,
    inventoryValue: inventoryValueList.reduce(
      (sum, item) => sum + item.stock * Number(item.costPrice),
      0
    ),
    totalSalesOrders: salesCount,
    totalPurchaseOrders: purchaseCount,
    criticalStockAlerts: critical
  });
}
