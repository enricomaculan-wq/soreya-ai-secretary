"use client";

import { createOrganizationForUser, getCurrentUser, getUserOrganization } from "@soreya/database";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { resolvePostLoginPath } from "@/lib/auth-paths";
import { shouldUseWebDemoData } from "@/lib/demo-data";
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase";
import { redirectAfterAuth } from "@/lib/session";
import { useI18n } from "@/lib/i18n";

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [organizationName, setOrganizationName] = useState("");
  const [timezone, setTimezone] = useState("Europe/Rome");
  const [message, setMessage] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasConfig = hasSupabaseBrowserConfig();

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      if (!hasConfig) {
        setIsChecking(false);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const user = await getCurrentUser(supabase);

        if (!isMounted) {
          return;
        }

        if (!user) {
          router.replace("/login?reason=session-expired");
          return;
        }

        const organization = await getUserOrganization(supabase, user.id);

        if (organization) {
          redirectAfterAuth(shouldUseWebDemoData() ? "/app" : resolvePostLoginPath("/dashboard"));
          return;
        }

        setIsChecking(false);
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : t("common.unavailable"));
          setIsChecking(false);
        }
      }
    }

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [hasConfig, router, t]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!hasConfig) {
      setMessage(t("login.missingSupabase"));
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      await createOrganizationForUser(supabase, {
        name: organizationName,
        timezone,
      });
      redirectAfterAuth(shouldUseWebDemoData() ? "/app" : resolvePostLoginPath("/dashboard"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("common.unavailable"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isChecking) {
    return (
      <main className="soreya-app-shell flex min-h-screen items-center justify-center px-5">
        <p className="text-sm font-medium text-[var(--ink-muted)]">{t("common.loading")}...</p>
      </main>
    );
  }

  return (
    <main className="soreya-app-shell flex min-h-screen items-center justify-center px-5 py-10">
      <div className="soreya-auth-card w-full max-w-lg p-6 sm:p-8">
        <p className="soreya-eyebrow">{t("onboarding.eyebrow")}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{t("onboarding.title")}</h1>
        <p className="soreya-lead mt-4">{t("onboarding.description")}</p>

        {!hasConfig ? (
          <div className="mt-5 rounded-[var(--radius-sm)] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {t("login.missingSupabase")}
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-[var(--ink-muted)]">{t("onboarding.organizationName")}</span>
            <input
              className="soreya-input mt-2 h-11 px-3 text-sm"
              autoComplete="organization"
              minLength={2}
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--ink-muted)]">{t("onboarding.defaultTimezone")}</span>
            <input
              className="soreya-input mt-2 h-11 px-3 text-sm"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              required
            />
          </label>

          <div className="soreya-trust-banner p-4 text-sm leading-relaxed">
            {t("onboarding.firstMembership")}
          </div>

          {message ? (
            <p className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm text-[var(--ink-muted)]">
              {message}
            </p>
          ) : null}

          <button
            className="soreya-btn-primary h-11 w-full disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting || !hasConfig}
            type="submit"
          >
            {isSubmitting ? `${t("common.loading")}...` : t("onboarding.createOrganization")}
          </button>
        </form>
      </div>
    </main>
  );
}
