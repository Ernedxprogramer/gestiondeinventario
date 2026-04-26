import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        details
      }
    },
    { status }
  );
}

export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return fail("Datos invalidos", 422, error.flatten());
  }

  if (error instanceof Error) {
    return fail(error.message, 400);
  }

  return fail("Ha ocurrido un error inesperado", 500);
}
