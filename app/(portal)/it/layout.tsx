import { requireAppAccess } from "@/lib/server-session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAppAccess("it.access");
  return children;
}
