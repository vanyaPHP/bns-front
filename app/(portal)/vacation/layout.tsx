import { requireAppAccess } from "@/server/guards";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAppAccess("vacation.access");
  return children;
}
