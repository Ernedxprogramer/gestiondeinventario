import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

import { fail } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me");

type TokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: TokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as TokenPayload;
}

export async function requireAuth(request: NextRequest, roles?: UserRole[]) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: fail("No autorizado", 401) };
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = await verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return { error: fail("Usuario no valido", 401) };
    }

    if (roles && !roles.includes(user.role)) {
      return { error: fail("No tienes permisos para esta accion", 403) };
    }

    return { user };
  } catch {
    return { error: fail("Token invalido o expirado", 401) };
  }
}
