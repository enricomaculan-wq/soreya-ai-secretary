"use client";

import { FormEvent, useState } from "react";

type DemoAccessFormCopy = {
  button: string;
  error: string;
  notConfigured: string;
  passwordLabel: string;
};

type DemoAccessFormProps = {
  copy: DemoAccessFormCopy;
  disabled: boolean;
  nextPath: string;
};

export function DemoAccessForm({ copy, disabled, nextPath }: DemoAccessFormProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled || isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/demo-access", {
        body: JSON.stringify({ next: nextPath, password }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const errorCode = readPayloadString(payload, "error");
        setError(errorCode === "not_configured" ? copy.notConfigured : copy.error);
        return;
      }

      window.location.assign(readPayloadString(payload, "next") ?? nextPath);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={submitAccess}>
      <div>
        <label className="text-sm font-medium text-stone-800" htmlFor="demo-password">
          {copy.passwordLabel}
        </label>
        <input
          autoComplete="current-password"
          className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base text-stone-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-100"
          disabled={disabled || isSubmitting}
          id="demo-password"
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
      </div>

      {disabled ? <p className="text-sm leading-6 text-red-700">{copy.notConfigured}</p> : null}
      {error ? <p className="text-sm leading-6 text-red-700">{error}</p> : null}

      <button
        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-stone-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400 sm:w-auto"
        disabled={disabled || isSubmitting}
        type="submit"
      >
        {copy.button}
      </button>
    </form>
  );
}

function readPayloadString(payload: unknown, key: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}
