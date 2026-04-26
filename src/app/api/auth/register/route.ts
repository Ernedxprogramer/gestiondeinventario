import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { fail, handleError, ok } from "@/lib/api";
import { hashPassword, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const totalUsers = await prisma.user.count();
    const body = registerSchema.parse(await request.json());

    if (totalUsers > 0) {
      const auth = await requireAuth(request, [UserRole.ADMIN]);
      if (auth.error) return auth.error;
    }

    const exists = await prisma.user.findUnique({
      where: { email: body.email }
    });

    if (exists) {
      return fail("Ya existe un usuario con ese correo", 409);
    }

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash: await hashPassword(body.password),
        role: totalUsers === 0 ? UserRole.ADMIN : body.role ?? UserRole.STAFF
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    if (totalUsers > 0) {
      const auth = await requireAuth(request, [UserRole.ADMIN]);
      if (!auth.error && auth.user) {
        await createAuditLog({
          userId: auth.user.id,
          action: "CREATE",
          entity: "User",
          entityId: user.id,
          metadata: { email: user.email, role: user.role }
        });
      }
    }

    return ok(user, 201);
  } catch (error) {
    return handleError(error);
  }
}
