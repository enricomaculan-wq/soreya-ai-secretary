"use client";

import { createOrganizationForUser, getCurrentUser, getUserOrganization } from "@soreya/database";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase";
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
          router.replace("/login");
          return;
        }

        const userOrganization = await getUserOrganization(supabase, user.id);

        if (!isMounted) {
          return;
        }

        if (userOrganization) {
          router.replace("/app");
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
      router.replace("/app");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("common.unavailable"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f6f2] px-5 text-stone-950">
        <p className="text-sm font-medium text-stone-600">{t("common.loading")}...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f6f2] px-5 py-10 text-stone-950">
      <div className="w-full max-w-lg rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.12em] text-emerald-700">{t("onboarding.eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">{t("onboarding.title")}</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          {t("onboarding.description")}
        </p>

        {!hasConfig ? (
          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {t("login.missingSupabase")}
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">{t("onboarding.organizationName")}</span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              autoComplete="organization"
              minLength={2}
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">{t("onboarding.defaultTimezone")}</span>
            <input
              className="mt-2 h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              required
            />
          </label>

          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {t("onboarding.firstMembership")}
          </div>

          {message ? (
            <p className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">{message}</p>
          ) : null}

          <button
            className="h-11 w-full rounded-md bg-stone-950 px-4 text-sm font-medium text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
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
