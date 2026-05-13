import { ConnectedCalendarsPanel } from "@/components/calendar-panels";
import { DailySummarySettingsPanel } from "@/components/daily-summary-panel";
import { EmailAccountsPanel } from "@/components/email-panels";
import { LanguageSettingsPanel } from "@/components/language-settings-panel";
import { MultiDevicePanel } from "@/components/multi-device-panel";
import { NotificationSettingsPanel } from "@/components/notification-panels";
import { SyncSchedulerPanel } from "@/components/sync-panels";
import { SystemStatusPanel } from "@/components/system-status-panel";
import { WhatsAppBusinessPanel } from "@/components/whatsapp-panels";
import { getDictionary, t as translate } from "@soreya/shared";
import Link from "next/link";
import { cookies } from "next/headers";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const dictionary = getDictionary(cookieStore.get("soreya_locale")?.value);
  const t = (key: string) => translate(dictionary, key);

  return (
    <main className="min-h-screen bg-[#f7f6f2] px-5 py-8 text-stone-950">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.12em] text-emerald-700">{t("navigation.settings")}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">{t("navigation.settings")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{t("safety.approvalFirst")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50" href="/app">
              {t("settings.backToDemo")}
            </Link>
            <Link className="rounded-md bg-stone-950 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-stone-800" href="/">
              {t("settings.home")}
            </Link>
          </div>
        </div>
        <div className="space-y-8">
          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <LanguageSettingsPanel />
          </section>
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-normal">{t("settings.systemStatus")}</h2>
            <SystemStatusPanel />
          </section>
          <section className="space-y-5">
            <h2 className="text-xl font-semibold tracking-normal">{t("settings.connectedAccounts")}</h2>
            <div>
              <h3 className="mb-3 text-base font-semibold tracking-normal">{t("email.accounts")}</h3>
              <EmailAccountsPanel />
            </div>
            <div>
              <h3 className="mb-3 text-base font-semibold tracking-normal">{t("calendar.connectedCalendars")}</h3>
              <ConnectedCalendarsPanel />
            </div>
            <div>
              <h3 className="mb-3 text-base font-semibold tracking-normal">{t("whatsapp.title")}</h3>
              <WhatsAppBusinessPanel />
            </div>
          </section>
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-normal">{t("settings.sync")}</h2>
            <SyncSchedulerPanel />
          </section>
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-normal">{t("settings.notifications")}</h2>
            <NotificationSettingsPanel />
          </section>
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-normal">{t("dailySummary.settings")}</h2>
            <DailySummarySettingsPanel />
          </section>
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-normal">{t("settings.multiDevice")}</h2>
            <MultiDevicePanel />
          </section>
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            <h2 className="text-xl font-semibold tracking-normal text-emerald-950">{t("settings.securityDryRun")}</h2>
            <p className="mt-2">{t("safety.dryRunExecution")}</p>
            <p className="mt-2">{t("safety.approvalIsNotExecution")}</p>
          </section>
        </div>
      </div>
    </main>
  );
}
