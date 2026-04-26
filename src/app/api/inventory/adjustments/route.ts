import { MovementType, UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { adjustStock } from "@/lib/inventory";
import { adjustmentSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN, UserRole.MANAGER]);
    if (auth.error) return auth.error;

    const body = adjustmentSchema.parse(await request.json());
    const quantityChange = body.direction === "IN" ? body.quantity : -body.quantity;
    const type =
      body.direction === "IN" ? MovementType.ADJUSTMENT_IN : MovementType.ADJUSTMENT_OUT;

    const product = await adjustStock({
      productId: body.productId,
      quantityChange,
      userId: auth.user.id,
      type,
      note: body.note,
      reference: body.reference,
      unitCost: body.unitCost
    });

    await createAuditLog({
      userId: auth.user.id,
      action: "ADJUST",
      entity: "Product",
      entityId: body.productId,
      metadata: body
    });

    return ok(product);
  } catch (error) {
    return handleError(error);
  }
}
