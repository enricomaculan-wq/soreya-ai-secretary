import { resolveLocale } from "@soreya/shared";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  DEMO_ACCESS_COOKIE,
  hasDemoAccess,
  isDemoAccessConfigured,
  isProductionEnvironment,
  safeDemoAccessNextPath,
  shouldBypassDemoAccessInDevelopment,
} from "@/lib/demo-access";

import { DemoAccessForm } from "./demo-access-form";

type DemoAccessPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type DemoAccessCopy = {
  button: string;
  error: string;
  home: string;
  notConfigured: string;
  passwordLabel: string;
  safety: string;
  subtitle: string;
  title: string;
};

const copyByLocale: Record<"it" | "en", DemoAccessCopy> = {
  en: {
    button: "Enter demo",
    error: "Incorrect password",
    home: "Back home",
    notConfigured: "Demo access is not configured",
    passwordLabel: "Password",
    safety: "This demo is a sandbox: no message is sent and no calendar is modified.",
    subtitle: "Enter the password you received to try the demo.",
    title: "Soreya demo access",
  },
  it: {
    button: "Entra nella demo",
    error: "Password non corretta",
    home: "Torna alla home",
    notConfigured: "Demo access is not configured",
    passwordLabel: "Password",
    safety: "Questa demo è sandbox: nessun messaggio viene inviato e nessun calendario viene modificato.",
    subtitle: "Inserisci la password ricevuta per provare la demo.",
    title: "Accesso demo Soreya",
  },
};

export default async function DemoAccessPage({ searchParams }: DemoAccessPageProps) {
  const params = await searchParams;
  const nextParam = Array.isArray(params?.next) ? params?.next[0] : params?.next;
  const nextPath = safeDemoAccessNextPath(nextParam);
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("soreya_locale")?.value);
  const copy = copyByLocale[locale];
  const isConfigured = isDemoAccessConfigured();
  const isProduction = isProductionEnvironment();
  const isMissingProductionConfig = isProduction && !isConfigured;
  const hasAccess = hasDemoAccess(cookieStore.get(DEMO_ACCESS_COOKIE)?.value);

  if (!isMissingProductionConfig && (hasAccess || shouldBypassDemoAccessInDevelopment())) {
    redirect(nextPath);
  }

  return (
    <main className="flex min-h-screen items-center soreya-page px-5 py-10 text-stone-950">
      <section className="mx-auto w-full max-w-md soreya-card p-6 shadow-sm">
        <Link className="text-lg font-semibold tracking-normal text-stone-950" href="/">
          Soreya
        </Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-normal">{copy.title}</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">{copy.subtitle}</p>

        <DemoAccessForm copy={copy} disabled={isMissingProductionConfig} nextPath={nextPath} />

        <p className="mt-6 rounded-md border border-[var(--trust-border)] bg-[var(--trust-soft)] p-3 text-sm leading-6 text-emerald-950">
          {copy.safety}
        </p>
        <Link className="mt-5 inline-flex text-sm font-medium text-stone-600 hover:text-stone-950" href="/">
          {copy.home}
        </Link>
      </section>
    </main>
  );
}
