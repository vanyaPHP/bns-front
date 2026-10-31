"use client";

import { createContext, useContext } from "react";
import { ShieldX } from "lucide-react";
import type { ClientSession } from "@/lib/types";

const SessionContext = createContext<ClientSession | null>(null);

export function SessionProvider({ session, children }: { session: ClientSession; children: React.ReactNode }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): ClientSession {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession must be used inside SessionProvider");
  return s;
}

export function useCan() {
  const s = useSession();
  return (...anyOf: string[]) => anyOf.some((p) => s.permissions.includes(p));
}

/** Renders children only if the user has any of the given permissions. */
export function Guard({ anyOf, allow, children }: { anyOf?: string[]; allow?: boolean; children: React.ReactNode }) {
  const can = useCan();
  const ok = (anyOf ? can(...anyOf) : true) && (allow ?? true);
  if (ok) return <>{children}</>;
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border border-line bg-card p-8 text-center">
      <ShieldX className="mx-auto mb-3 h-10 w-10 text-fg-subtle" />
      <div className="text-lg font-bold text-fg">Недостаточно прав</div>
      <p className="mt-1 text-sm text-fg-muted">У вас нет доступа к этому разделу. Обратитесь к администратору системы.</p>
    </div>
  );
}
