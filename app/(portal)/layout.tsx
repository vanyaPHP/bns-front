import { redirect } from "next/navigation";
import { getSession } from "@/lib/server-session";
import { SessionProvider } from "@/components/session";
import { ToastProvider } from "@/components/ui";
import { AppShell } from "@/components/shell/app-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <SessionProvider session={session}>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </SessionProvider>
  );
}
