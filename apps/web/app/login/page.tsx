"use client";

import { getUserOrganization } from "@soreya/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { shouldUseWebDemoData } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase";
import { syncSupabaseSessionToServer } from "@/lib/session";

type AuthMode = "sign-in" | "sign-up";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasConfig = hasSupabaseBrowserConfig();
  const demoMode = shouldUseWebDemoData();

  useEffect(() => {
    if (demoMode) {
      router.replace("/app");
    }
  }, [demoMode, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (demoMode) {
      router.replace("/app");
      return;
    }

    if (!hasConfig) {
      setMessage(t("login.missingSupabase"));
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const credentials = { email: email.trim(), password };
      const authResponse =
        mode === "sign-in"
          ? await supabase.auth.signInWithPassword(credentials)
          : await supabase.auth.signUp(credentials);

      if (authResponse.error) {
        throw authResponse.error;
      }

      if (!authResponse.data.session) {
        setMessage(t("login.checkEmail"));
        return;
      }

      await syncSupabaseSessionToServer(authResponse.data.session);
      const userOrganization = await getUserOrganization(supabase, authResponse.data.user?.id);
      router.replace(userOrganization ? "/app" : "/onboarding");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("login.authFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f6f2] px-5 py-10 text-stone-950">
      <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-emerald-700">Soreya</p>
          {demoMode ? (
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
              {t("demo.badge")}
            </span>
          ) : null}
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          {demoMode ? t("login.openingDemo") : mode === "sign-in" ? t("login.signIn") : t("login.signUp")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          {demoMode
            ? t("demo.description")
            : t("login.description")}
        </p>

        {demoMode ? (
          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {t("demo.loginDescription")}
          </div>
        ) : null}

        {!hasConfig && !demoMode ? (
          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {t("login.missingSupabase")}
          </div>
        ) : null}

        {demoMode ? (
          <button
            className="mt-6 h-11 w-full rounded-md bg-stone-950 px-4 text-sm font-medium text-white hover:bg-stone-800"
            onClick={() => router.replace("/app")}
            type="button"
          >
            {t("demo.enterDashboard")}
          </button>
        ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">{t("login.email")}</span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">{t("login.password")}</span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {message ? (
            <p className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">{message}</p>
          ) : null}

          <button
            className="h-11 w-full rounded-md bg-stone-950 px-4 text-sm font-medium text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            disabled={isSubmitting || !hasConfig || demoMode}
            type="submit"
          >
            {isSubmitting ? `${t("common.loading")}...` : mode === "sign-in" ? t("login.signIn") : t("login.signUp")}
          </button>
        </form>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 text-sm">
          {demoMode ? (
            <span className="text-stone-500">{t("login.localDemoAccess")}</span>
          ) : (
            <button
              className="font-medium text-emerald-700 hover:text-emerald-800"
              type="button"
              onClick={() => {
                setMode(mode === "sign-in" ? "sign-up" : "sign-in");
                setMessage(null);
              }}
            >
              {mode === "sign-in" ? t("login.createAccount") : t("login.useExisting")}
            </button>
          )}
          <Link className="text-stone-500 hover:text-stone-700" href="/app">
            {t("login.dashboard")}
          </Link>
        </div>
      </div>
    </main>
  );
}
