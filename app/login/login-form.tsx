"use client";

import { useState } from "react";
import { Droplet, KeyRound, LogIn, UserRound } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button, Field, Input } from "@/components/ui";

const DEMO = [
  { login: "admin", password: "admin123", role: "Системный администратор" },
  { login: "hr.head", password: "demo123", role: "Начальник отдела кадров" },
  { login: "hr.manager", password: "demo123", role: "Менеджер по персоналу" },
  { login: "it.head", password: "demo123", role: "Начальник ИТ-поддержки" },
  { login: "it.engineer", password: "demo123", role: "Инженер ИТ-поддержки" },
  { login: "dept.head", password: "demo123", role: "Начальник НГДУ" },
  { login: "employee", password: "demo123", role: "Сотрудник" },
  { login: "auditor", password: "demo123", role: "Аудитор" },
];

export function LoginForm({ next }: { next: string }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/auth/login", { body: { login, password } });
      window.location.href = next;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-[#0d1a33] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(56,130,246,0.45),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(14,165,233,0.35),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-700 shadow-lg">
              <Droplet className="h-6 w-6" fill="currentColor" />
            </span>
            <div>
              <div className="text-2xl font-extrabold tracking-tight">белоруснефть</div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">корпоративный портал</div>
            </div>
          </div>
          <div className="max-w-lg">
            <h1 className="text-4xl font-bold leading-tight">Единое рабочее пространство сотрудников объединения</h1>
            <p className="mt-4 text-white/70">
              Кадровый учёт, ИТ-поддержка, отпуска и администрирование доступа — в одной системе с ролевой моделью и журналом аудита.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                ["18", "подразделений"],
                ["4", "приложения"],
                ["24/7", "ИТ-поддержка"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="text-2xl font-bold">{v}</div>
                  <div className="text-xs text-white/60">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-xs text-white/40">© ГПО «Белоруснефть», г. Гомель · Прототип MVP</div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-bg p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="text-2xl font-extrabold tracking-tight text-fg">белоруснефть</div>
          </div>
          <h2 className="text-[28px] font-bold text-fg">Вход в систему</h2>
          <p className="mt-1 text-sm text-fg-muted">Используйте корпоративную учётную запись</p>

          <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
            <Field label="Логин" required>
              <Input
                icon={<UserRound className="h-4 w-4" />}
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoComplete="username"
                placeholder="например, employee"
                autoFocus
              />
            </Field>
            <Field label="Пароль" required>
              <Input
                icon={<KeyRound className="h-4 w-4" />}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </Field>
            {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</div>}
            <Button type="submit" variant="primary" size="lg" loading={loading} icon={<LogIn className="h-4 w-4" />}>
              Войти
            </Button>
          </form>

          <div className="mt-10 rounded-xl border border-line bg-card p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Демо-учётные записи</div>
            <div className="grid grid-cols-2 gap-1.5">
              {DEMO.map((d) => (
                <button
                  key={d.login}
                  type="button"
                  onClick={() => {
                    setLogin(d.login);
                    setPassword(d.password);
                  }}
                  className="rounded-lg border border-transparent px-2.5 py-1.5 text-left transition-colors hover:border-line hover:bg-hover"
                >
                  <div className="font-mono text-xs font-semibold text-fg">{d.login}</div>
                  <div className="truncate text-[11px] text-fg-subtle">{d.role}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
