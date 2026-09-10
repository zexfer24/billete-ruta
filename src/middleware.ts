import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Cookie de sesión de pasajero. Coincide con PASSENGER_COOKIE de
 * src/modules/auth/sessions.ts. Se repite el literal aquí en vez de importar
 * ese módulo porque el middleware corre en el runtime de Edge y no debe
 * consultar la base de datos ni cargar el cliente de Prisma.
 */
const PASSENGER_COOKIE = "tr_pax";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(PASSENGER_COOKIE)?.value;
  if (!token) {
    const url = new URL("/ingresar", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/mi/:path*"],
};
