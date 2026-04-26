import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supplierSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const suppliers = await prisma.supplier.findMany({
    include: {
      _count: {
        select: { products: true, purchaseOrders: true }
      }
    },
    orderBy: { name: "asc" }
  });

  return ok(suppliers);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.MANAGER]);
    if (auth.error) return auth.error;
    const body = supplierSchema.parse(await request.json());
    const supplier = await prisma.supplier.create({ data: body });

    await createAuditLog({
      userId: auth.user.id,
      action: "CREATE",
      entity: "Supplier",
      entityId: supplier.id,
      metadata: body
    });

    return ok(supplier, 201);
  } catch (error) {
    return handleError(error);
  }
}
