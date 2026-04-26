import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userUpdateSchema } from "@/lib/validators";

async function resolveParams(context: { params: Promise<{ id: string }> }) {
  return context.params;
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request, [UserRole.ADMIN]);
    if (auth.error) return auth.error;

    const { id } = await resolveParams(context);
    const body = userUpdateSchema.parse(await request.json());
    const user = await prisma.user.update({
      where: { id },
      data: body,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    await createAuditLog({
      userId: auth.user.id,
      action: "UPDATE",
      entity: "User",
      entityId: id,
      metadata: body
    });

    return ok(user);
  } catch (error) {
    return handleError(error);
  }
}
