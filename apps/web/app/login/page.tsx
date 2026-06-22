"use client";

import { getUserOrganization } from "@soreya/database";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useRef, useState } from "react";

import { resolvePostLoginPath } from "@/lib/auth-paths";
import { shouldUseWebDemoData } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";
import { redirectAfterAuth, syncSupabaseSessionToServer } from "@/lib/session";
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase";
import { useIsClientReady } from "@/lib/use-client-runtime";

type AuthMode = "sign-in" | "sign-up";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="soreya-app-shell flex min-h-screen items-center justify-center px-5 py-10">
          <p className="text-sm text-stone-500">…</p>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const isReady = useIsClientReady();
  const hasConfig = hasSupabaseBrowserConfig();
  const demoMode = shouldUseWebDemoData();
  const sessionExpired = searchParams.get("reason") === "session-expired";
  const nextPath = searchParams.get("next");
  const sessionExpiredMessage = sessionExpired ? t("onboarding.sessionExpired") : null;

  useEffect(() => {
    if (demoMode) {
      router.replace("/app");
    }
  }, [demoMode, router]);

  const displayMessage = message ?? sessionExpiredMessage;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isReady) {
      return;
    }

    const form = formRef.current ?? event.currentTarget;
    const emailInput = form.querySelector<HTMLInputElement>('input[type="email"]');
    const passwordInput = form.querySelector<HTMLInputElement>('input[type="password"]');
    const submittedEmail = emailInput?.value.trim() ?? email.trim();
    const submittedPassword = passwordInput?.value ?? password;

    setEmail(submittedEmail);
    setPassword(submittedPassword);
    setMessage(null);

    if (demoMode) {
      router.replace("/app");
      return;
    }

    if (!hasConfig) {
      setMessage(t("login.missingSupabase"));
      return;
    }

    if (!submittedEmail || submittedPassword.length < 6) {
      setMessage(t("login.missingCredentials"));
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const credentials = { email: submittedEmail, password: submittedPassword };
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

      const { data: sessionCheck, error: sessionCheckError } = await supabase.auth.getSession();
      if (sessionCheckError || !sessionCheck.session) {
        throw new Error(t("onboarding.sessionExpired"));
      }

      const userOrganization = await getUserOrganization(supabase, authResponse.data.user?.id);
      if (!userOrganization) {
        redirectAfterAuth("/onboarding");
        return;
      }

      redirectAfterAuth(
        shouldUseWebDemoData() ? "/app" : resolvePostLoginPath(nextPath),
      );
    } catch (error) {
      const fallback = error instanceof Error ? error.message : t("login.authFailed");
      setMessage(
        fallback.includes("persist server session") || fallback.includes("Invalid Supabase session")
          ? t("login.sessionSyncFailed")
          : fallback,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="soreya-app-shell flex min-h-screen items-center justify-center px-5 py-10">
      <div className="soreya-auth-card w-full max-w-md p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="soreya-eyebrow">Soreya</p>
          {demoMode ? (
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
              {t("demo.badge")}
            </span>
          ) : null}
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
          {demoMode ? t("login.openingDemo") : mode === "sign-in" ? t("login.signIn") : t("login.signUp")}
        </h1>
        <p className="soreya-lead mt-2">
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
            <p>{t("login.missingSupabase")}</p>
            <p className="mt-2">{t("login.configRequiredHint")}</p>
          </div>
        ) : null}

        {demoMode ? (
          <button
            className="soreya-btn-primary mt-6 h-11 w-full"
            onClick={() => router.replace("/app")}
            type="button"
          >
            {t("demo.enterDashboard")}
          </button>
        ) : (
        <form ref={formRef} className="mt-6 space-y-4" noValidate onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">{t("login.email")}</span>
            <input
              className="soreya-input mt-2 h-11 px-3 text-sm"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onInput={(event) => setEmail(event.currentTarget.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">{t("login.password")}</span>
            <input
              className="soreya-input mt-2 h-11 px-3 text-sm"
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onInput={(event) => setPassword(event.currentTarget.value)}
            />
          </label>

          <div aria-live="polite" className="min-h-5">
            {isSubmitting ? (
              <p className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                {t("common.loading")}…
              </p>
            ) : null}
            {!isSubmitting && displayMessage ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{displayMessage}</p>
            ) : null}
          </div>

          {!hasConfig && !displayMessage ? (
            <p className="text-sm text-amber-700">{t("login.configRequiredHint")}</p>
          ) : null}

          <button
            className="soreya-btn-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isReady || isSubmitting || !hasConfig || demoMode}
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
              className="font-medium text-[var(--trust)] hover:opacity-80"
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
