import { NextRequest } from "next/server";

import { ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const [products, stockCandidates, stockValue, recentMovements] = await Promise.all([
    prisma.product.count(),
    prisma.product.findMany({
      orderBy: { stock: "asc" },
      take: 50
    }),
    prisma.product.findMany({
      select: {
        stock: true,
        costPrice: true
      }
    }),
    prisma.inventoryMovement.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  const lowStockItems = stockCandidates
    .filter((product) => product.stock <= 0 || (product.minStock > 0 && product.stock <= product.minStock))
    .slice(0, 10);

  return ok({
    totalProducts: products,
    lowStockItems,
    inventoryValuation: stockValue.reduce(
      (sum, item) => sum + item.stock * Number(item.costPrice),
      0
    ),
    recentMovements
  });
}
