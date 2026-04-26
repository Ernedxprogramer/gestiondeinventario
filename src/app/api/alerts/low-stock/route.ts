import { NextRequest } from "next/server";

import { ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const products = await prisma.product.findMany({
    where: {
      minStock: { gt: 0 }
    },
    include: {
      category: true,
      supplier: true
    },
    orderBy: { stock: "asc" }
  });

  const alerts = products
    .filter((product) => product.stock <= product.minStock)
    .map((product) => ({
      ...product,
      shortage: product.minStock - product.stock
    }));

  return ok(alerts);
}
