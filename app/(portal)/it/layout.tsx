import { requireAppAccess } from "@/server/guards";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAppAccess("it.access");
  return children;
}
