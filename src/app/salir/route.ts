import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { destroyPassengerSession, PASSENGER_COOKIE } from "@/modules/auth";

export async function GET(request: Request) {
  const store = await cookies();
  const token = store.get(PASSENGER_COOKIE)?.value;
  if (token) {
    await destroyPassengerSession(token);
  }
  store.delete(PASSENGER_COOKIE);
  return NextResponse.redirect(new URL("/", request.url));
}
