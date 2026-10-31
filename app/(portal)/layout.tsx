import { redirect } from "next/navigation";
import { getAuth, toClientSession } from "@/server/auth";
import { SessionProvider } from "@/components/session";
import { ToastProvider } from "@/components/ui";
import { AppShell } from "@/components/shell/app-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuth();
  if (!ctx) redirect("/login");
  return (
    <SessionProvider session={toClientSession(ctx)}>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </SessionProvider>
  );
}
