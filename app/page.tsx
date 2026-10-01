import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, userFromToken } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { adminConfigured } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await userFromToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (user) redirect(user.role === "admin" ? "/app/admin" : "/app/inicio");
  return <AuthForm configured={adminConfigured()} />;
}
