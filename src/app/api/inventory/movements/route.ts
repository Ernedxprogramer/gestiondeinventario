import { NextRequest } from "next/server";

import { handleError, ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const type = searchParams.get("type");

  const movements = await prisma.inventoryMovement.findMany({
    where: {
      productId: productId ?? undefined,
      type: type ? (type as never) : undefined
    },
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return ok(movements);
}

export async function POST() {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        message:
          "Usa /api/inventory/adjustments, /api/purchase-orders y /api/sales-orders para generar movimientos controlados."
      }
    }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}
