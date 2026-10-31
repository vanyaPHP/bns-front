"use client";

import { useCallback, useEffect, useState } from "react";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

function resolveApiUrl(url: string) {
  if (!API_BASE_URL || /^https?:\/\//.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

export async function apiFetch<T = unknown>(
  url: string,
  options: { method?: string; body?: unknown; formData?: FormData } = {},
): Promise<T> {
  const res = await fetch(resolveApiUrl(url), {
    method: options.method ?? (options.body || options.formData ? "POST" : "GET"),
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.formData ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    cache: "no-store",
  });
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
  }
  const data = res.headers.get("content-type")?.includes("application/json") ? await res.json() : null;
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? "Ошибка запроса");
  return data as T;
}

interface ApiState<T> {
  key: string | null;
  data: T | undefined;
  error: string | null;
}

/** Minimal data-fetching hook. Pass `null` as url to skip fetching. */
export function useApi<T>(url: string | null) {
  const [state, setState] = useState<ApiState<T>>({ key: null, data: undefined, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    apiFetch<T>(url)
      .then((data) => !cancelled && setState({ key: url, data, error: null }))
      .catch((e: Error) => !cancelled && setState((s) => ({ key: url, data: s.data, error: e.message })));
    return () => {
      cancelled = true;
    };
  }, [url, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const mutate = useCallback((fn: (prev: T | undefined) => T) => setState((s) => ({ ...s, data: fn(s.data) })), []);

  return {
    data: state.data,
    error: state.error,
    loading: url !== null && state.key !== url,
    reload,
    mutate,
  };
}
