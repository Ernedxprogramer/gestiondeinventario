import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const customers = await prisma.customer.findMany({
    include: {
      _count: {
        select: { salesOrders: true }
      }
    },
    orderBy: { name: "asc" }
  });

  return ok(customers);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF]);
    if (auth.error) return auth.error;
    const body = customerSchema.parse(await request.json());
    const customer = await prisma.customer.create({ data: body });

    await createAuditLog({
      userId: auth.user.id,
      action: "CREATE",
      entity: "Customer",
      entityId: customer.id,
      metadata: body
    });

    return ok(customer, 201);
  } catch (error) {
    return handleError(error);
  }
}
