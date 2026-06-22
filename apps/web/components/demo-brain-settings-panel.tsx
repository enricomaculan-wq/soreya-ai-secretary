"use client";

import {
  type OrganizationBrainSettings,
  type OrganizationService,
  type ReasoningMode,
} from "@soreya/shared";
import { useMemo, useState } from "react";

import { useI18n } from "@/lib/i18n";
import { readDemoBrainOverrides, saveDemoBrainServices, saveDemoBrainSettings } from "@/lib/demo-brain-store";

const reasoningModes: ReasoningMode[] = ["conservative", "balanced", "proactive"];

type DemoBrainCatalogSettingsProps = {
  open: boolean;
};

export function DemoBrainCatalogSettings({ open }: DemoBrainCatalogSettingsProps) {
  const { locale, t } = useI18n();
  const seed = useMemo(() => readDemoBrainOverrides(locale), [locale]);
  const [settings, setSettings] = useState<OrganizationBrainSettings>(seed.settings);
  const [services, setServices] = useState<OrganizationService[]>(seed.services);
  const [brainMessage, setBrainMessage] = useState<string | null>(null);
  const [catalogMessage, setCatalogMessage] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    slug: "",
    durationMinutes: "30",
    priceCents: "",
    aliases: "",
  });

  if (!open) {
    return null;
  }

  function saveBrainSettings() {
    saveDemoBrainSettings(settings);
    setBrainMessage(t("brain.saved"));
  }

  function addService() {
    const name = serviceForm.name.trim();
    if (!name) {
      return;
    }

    const durationMinutes = Number(serviceForm.durationMinutes);
    const priceCents =
      serviceForm.priceCents.trim() === "" ? null : Number(serviceForm.priceCents);

    setServices((current) => {
      const next = [
        ...current,
        {
          id: `demo-local-${current.length + 1}`,
          organizationId: "demo",
          slug: serviceForm.slug.trim() || name.toLowerCase().replace(/\s+/g, "_"),
          name,
          durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 30,
          priceCents:
            priceCents !== null && Number.isFinite(priceCents) && priceCents >= 0 ? priceCents : null,
          currency: "EUR",
          isActive: true,
          aliases: serviceForm.aliases
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          description: null,
          sortOrder: 100 + current.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      saveDemoBrainServices(next);
      return next;
    });

    setServiceForm({
      name: "",
      slug: "",
      durationMinutes: "30",
      priceCents: "",
      aliases: "",
    });
    setCatalogMessage(t("brain.serviceSaved"));
  }

  return (
    <div className="mt-6 space-y-4" id="demo-workspace-settings">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="soreya-workspace-panel">
          <div className="soreya-workspace-panel-header">
            <h2 className="text-[15px] font-medium tracking-[-0.02em] text-[var(--foreground)]">
              {t("brain.title")}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-subtle)]">{t("brain.description")}</p>
          </div>
          <div className="soreya-workspace-panel-body space-y-4">
            {brainMessage ? (
              <p className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-[13px] text-[var(--ink-muted)]">
                {brainMessage}
              </p>
            ) : null}

            <label className="grid gap-2 text-[13px] font-medium text-[var(--foreground)]">
              {t("brain.reasoningMode")}
              <select
                className="soreya-input px-3 py-2 text-[13px]"
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    reasoningMode: event.target.value as ReasoningMode,
                  }))
                }
                value={settings.reasoningMode}
              >
                {reasoningModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(`brain.reasoningModes.${mode}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-[13px] font-medium text-[var(--foreground)]">
              {t("brain.ownerStyleNotes")}
              <textarea
                className="soreya-input min-h-24 px-3 py-2 text-[13px]"
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    ownerStyleNotes: event.target.value || null,
                  }))
                }
                placeholder={t("brain.ownerStyleNotesPlaceholder")}
                value={settings.ownerStyleNotes ?? ""}
              />
            </label>

            <label className="flex items-center gap-2 text-[13px] text-[var(--ink-muted)]">
              <input
                checked={settings.requireServiceBeforeSlots}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    requireServiceBeforeSlots: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              {t("brain.requireServiceBeforeSlots")}
            </label>

            <label className="flex items-center gap-2 text-[13px] text-[var(--ink-muted)]">
              <input
                checked={settings.requireExplicitDate}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    requireExplicitDate: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              {t("brain.requireExplicitDate")}
            </label>

            <button className="soreya-btn-primary px-4 py-2 text-[13px]" onClick={saveBrainSettings} type="button">
              {t("brain.saveBrain")}
            </button>
          </div>
        </section>

        <section className="soreya-workspace-panel">
          <div className="soreya-workspace-panel-header">
            <h2 className="text-[15px] font-medium tracking-[-0.02em] text-[var(--foreground)]">
              {t("brain.servicesTitle")}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-subtle)]">
              {t("brain.servicesDescription")}
            </p>
          </div>
          <div className="soreya-workspace-panel-body space-y-4">
            {catalogMessage ? (
              <p className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-[13px] text-[var(--ink-muted)]">
                {catalogMessage}
              </p>
            ) : null}

            <ul className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
              {services.map((service) => (
                <li className="grid gap-1 px-4 py-3 text-[13px]" key={service.id}>
                  <p className="font-medium text-[var(--foreground)]">{service.name}</p>
                  <p className="text-[var(--ink-muted)]">
                    {service.durationMinutes} min
                    {service.priceCents !== null
                      ? ` · ${(service.priceCents / 100).toFixed(2)} ${service.currency}`
                      : ` · ${t("brain.priceOptional")}`}
                  </p>
                  {service.aliases.length > 0 ? (
                    <p className="text-[var(--ink-subtle)]">{service.aliases.join(", ")}</p>
                  ) : null}
                </li>
              ))}
            </ul>

            <div className="grid gap-3 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] p-4 md:grid-cols-2">
              <input
                className="soreya-input px-3 py-2 text-[13px]"
                onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value }))}
                placeholder={t("brain.serviceName")}
                value={serviceForm.name}
              />
              <input
                className="soreya-input px-3 py-2 text-[13px]"
                onChange={(event) => setServiceForm((current) => ({ ...current, slug: event.target.value }))}
                placeholder={t("brain.serviceSlug")}
                value={serviceForm.slug}
              />
              <input
                className="soreya-input px-3 py-2 text-[13px]"
                onChange={(event) =>
                  setServiceForm((current) => ({ ...current, durationMinutes: event.target.value }))
                }
                placeholder={t("brain.durationMinutes")}
                value={serviceForm.durationMinutes}
              />
              <input
                className="soreya-input px-3 py-2 text-[13px]"
                onChange={(event) => setServiceForm((current) => ({ ...current, priceCents: event.target.value }))}
                placeholder={t("brain.priceCents")}
                value={serviceForm.priceCents}
              />
              <input
                className="soreya-input px-3 py-2 text-[13px] md:col-span-2"
                onChange={(event) => setServiceForm((current) => ({ ...current, aliases: event.target.value }))}
                placeholder={t("brain.aliases")}
                value={serviceForm.aliases}
              />
              <button
                className="soreya-btn-secondary w-fit px-4 py-2 text-[13px] md:col-span-2"
                onClick={addService}
                type="button"
              >
                {t("brain.addService")}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
