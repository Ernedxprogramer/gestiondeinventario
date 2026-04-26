import { ProductStatus, UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const status = searchParams.get("status") as ProductStatus | null;
  const lowStock = searchParams.get("lowStock");

  const products = await prisma.product.findMany({
    where: {
      status: status ?? undefined,
      OR: query
        ? [
            { name: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
            { barcode: { contains: query, mode: "insensitive" } }
          ]
        : undefined
    },
    include: {
      category: true,
      supplier: true
    },
    orderBy: { createdAt: "desc" }
  });

  const filteredProducts =
    lowStock === "true"
      ? products.filter((product) =>
          product.stock <= 0 || (product.minStock > 0 && product.stock <= product.minStock)
        )
      : products;

  return ok(filteredProducts);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.MANAGER]);
    if (auth.error) return auth.error;

    const body = productSchema.parse(await request.json());
    const product = await prisma.product.create({
      data: body,
      include: {
        category: true,
        supplier: true
      }
    });

    await createAuditLog({
      userId: auth.user.id,
      action: "CREATE",
      entity: "Product",
      entityId: product.id,
      metadata: body
    });

    return ok(product, 201);
  } catch (error) {
    return handleError(error);
  }
}
