import { NextRequest } from "next/server";

import { fail, handleError, ok } from "@/lib/api";
import { signToken, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const body = loginSchema.parse(await request.json());

    const user = await prisma.user.findUnique({
      where: { email: body.email }
    });

    if (!user || !user.isActive) {
      return fail("Credenciales invalidas", 401);
    }

    const isValid = await verifyPassword(body.password, user.passwordHash);
    if (!isValid) {
      return fail("Credenciales invalidas", 401);
    }

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role
    });

    return ok({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return handleError(error);
  }
}
