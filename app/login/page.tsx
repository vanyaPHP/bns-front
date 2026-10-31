import { redirect } from "next/navigation";
import { getSession } from "@/lib/server-session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Вход" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getSession()) redirect("/");
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" && next.startsWith("/") ? next : "/"} />;
}
