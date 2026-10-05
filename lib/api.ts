import { NextResponse } from "next/server";

type ApiHandler<T extends unknown[]> = (...args: T) => Promise<Response>;

export function withApiErrors<T extends unknown[]>(handler: ApiHandler<T>): ApiHandler<T> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("API request failed", error);
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
    }
  };
}
