import { redirect } from "next/navigation";
import { getAuth } from "@/server/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Вход" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getAuth()) redirect("/");
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" && next.startsWith("/") ? next : "/"} />;
}
