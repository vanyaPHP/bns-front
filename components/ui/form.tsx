"use client";

import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";

const control =
  "w-full rounded-lg border border-line bg-card text-sm text-fg placeholder:text-fg-subtle transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode }>(
  function Input({ className = "", icon, ...rest }, ref) {
    if (icon) {
      return (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle">{icon}</span>
          <input ref={ref} className={`${control} h-10 pl-10 pr-3 ${className}`} {...rest} />
        </div>
      );
    }
    return <input ref={ref} className={`${control} h-10 px-3 ${className}`} {...rest} />;
  },
);

export function Textarea({ className = "", ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${control} min-h-[96px] px-3 py-2.5 ${className}`} {...rest} />;
}

export interface Option {
  value: string;
  label: string;
}

export function Select({
  options,
  placeholder,
  className = "",
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { options: Option[]; placeholder?: string }) {
  return (
    <div className="relative">
      <select className={`${control} h-10 appearance-none pl-3 pr-9 ${className}`} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
    </div>
  );
}

export function Field({
  label,
  required,
  hint,
  className = "",
  group,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  /** Render as a non-label container, for groups of controls such as chip sets. */
  group?: boolean;
  children: React.ReactNode;
}) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[13px] font-semibold text-fg">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-fg-subtle">{hint}</span>}
    </Tag>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line accent-[var(--primary)]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {(label || description) && (
        <span className="flex flex-col">
          {label && <span className="text-sm font-medium text-fg">{label}</span>}
          {description && <span className="text-xs text-fg-subtle">{description}</span>}
        </span>
      )}
    </label>
  );
}

export function FormGrid({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) {
  const c = cols === 3 ? "md:grid-cols-3" : cols === 2 ? "md:grid-cols-2" : "";
  return <div className={`grid grid-cols-1 gap-x-6 gap-y-5 ${c}`}>{children}</div>;
}
