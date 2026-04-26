import { NextRequest } from "next/server";

import { ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const [topSelling, topPurchased, latestSales, latestPurchases] = await Promise.all([
    prisma.salesOrderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5
    }),
    prisma.purchaseOrderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5
    }),
    prisma.salesOrder.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { customer: true, items: true }
    }),
    prisma.purchaseOrder.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { supplier: true, items: true }
    })
  ]);

  const productIds = [...new Set([...topSelling, ...topPurchased].map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds
      }
    },
    select: {
      id: true,
      sku: true,
      name: true
    }
  });

  const decorate = <T extends { productId: string } & Record<string, unknown>>(items: T[]) =>
    items.map((item) => ({
      ...item,
      product: products.find((product) => product.id === item.productId) ?? null
    }));

  return ok({
    topSellingProducts: decorate(topSelling),
    topPurchasedProducts: decorate(topPurchased),
    latestSales,
    latestPurchases
  });
}
