"use client";

import type { OrganizationBrainSettings, OrganizationService, ReasoningMode } from "@soreya/shared";
import { DEFAULT_ORGANIZATION_BRAIN_SETTINGS, parseEuroPriceInputToCents } from "@soreya/shared";
import { useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n";

const reasoningModes: ReasoningMode[] = ["conservative", "balanced", "proactive"];

export function BrainSettingsPanel() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<OrganizationBrainSettings>(DEFAULT_ORGANIZATION_BRAIN_SETTINGS);
  const [services, setServices] = useState<OrganizationService[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    slug: "",
    durationMinutes: "30",
    priceEuros: "",
    currency: "EUR",
    aliases: "",
  });
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    durationMinutes: "",
    priceEuros: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadBrain() {
      try {
        const response = await fetch("/api/organization/brain");
        const payload = (await response.json()) as {
          settings?: OrganizationBrainSettings;
          services?: OrganizationService[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load Brain settings.");
        }

        if (isMounted) {
          setSettings(payload.settings ?? DEFAULT_ORGANIZATION_BRAIN_SETTINGS);
          setServices(payload.services ?? []);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : "Unable to load Brain settings.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadBrain();

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveSettings() {
    setMessage(null);

    try {
      const response = await fetch("/api/organization/brain", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save Brain settings.");
      }

      setMessage(t("brain.saved"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save Brain settings.");
    }
  }

  async function addService() {
    setMessage(null);

    try {
      const response = await fetch("/api/organization/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: serviceForm.name,
          slug: serviceForm.slug || undefined,
          durationMinutes: Number(serviceForm.durationMinutes),
          priceCents: parseEuroPriceInputToCents(serviceForm.priceEuros),
          currency: serviceForm.currency,
          aliases: serviceForm.aliases,
        }),
      });
      const payload = (await response.json()) as { service?: OrganizationService; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to add service.");
      }

      if (payload.service) {
        setServices((current) => [...current, payload.service!]);
      }

      setServiceForm({
        name: "",
        slug: "",
        durationMinutes: "30",
        priceEuros: "",
        currency: "EUR",
        aliases: "",
      });
      setMessage(t("brain.serviceSaved"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add service.");
    }
  }

  function startEditingService(service: OrganizationService) {
    setEditingServiceId(service.id);
    setEditForm({
      durationMinutes: String(service.durationMinutes),
      priceEuros: service.priceCents !== null ? (service.priceCents / 100).toFixed(2).replace(".", ",") : "",
    });
  }

  async function saveServiceEdits(serviceId: string) {
    setMessage(null);

    try {
      const response = await fetch(`/api/organization/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMinutes: Number(editForm.durationMinutes),
          priceEuros: editForm.priceEuros,
        }),
      });
      const payload = (await response.json()) as { service?: OrganizationService; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update service.");
      }

      if (payload.service) {
        setServices((current) => current.map((service) => (service.id === serviceId ? payload.service! : service)));
      }

      setEditingServiceId(null);
      setMessage(t("brain.serviceUpdated"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update service.");
    }
  }

  if (isLoading) {
    return <p className="text-sm text-stone-500">{t("common.loading")}…</p>;
  }

  return (
    <div className="space-y-6">
      {message ? <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">{message}</p> : null}

      <div className="grid gap-4 soreya-card-muted p-4">
        <label className="grid gap-2 text-sm font-medium text-stone-800">
          {t("brain.reasoningMode")}
          <select
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            onChange={(event) => setSettings((current) => ({ ...current, reasoningMode: event.target.value as ReasoningMode }))}
            value={settings.reasoningMode}
          >
            {reasoningModes.map((mode) => (
              <option key={mode} value={mode}>
                {t(`brain.reasoningModes.${mode}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-stone-800">
          {t("brain.ownerStyleNotes")}
          <textarea
            className="min-h-24 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            onChange={(event) => setSettings((current) => ({ ...current, ownerStyleNotes: event.target.value || null }))}
            placeholder={t("brain.ownerStyleNotesPlaceholder")}
            value={settings.ownerStyleNotes ?? ""}
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            checked={settings.requireServiceBeforeSlots}
            onChange={(event) => setSettings((current) => ({ ...current, requireServiceBeforeSlots: event.target.checked }))}
            type="checkbox"
          />
          {t("brain.requireServiceBeforeSlots")}
        </label>

        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            checked={settings.requireExplicitDate}
            onChange={(event) => setSettings((current) => ({ ...current, requireExplicitDate: event.target.checked }))}
            type="checkbox"
          />
          {t("brain.requireExplicitDate")}
        </label>

        <button
          className="w-fit rounded-md bg-stone-950 px-4 py-2 text-sm font-medium text-white"
          onClick={() => void saveSettings()}
          type="button"
        >
          {t("brain.saveBrain")}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-stone-950">{t("brain.servicesTitle")}</h3>
          <p className="mt-1 text-sm text-stone-600">{t("brain.servicesDescription")}</p>
        </div>

        {services.length > 0 ? (
          <ul className="divide-y divide-stone-200 soreya-card">
            {services.map((service) => (
              <li className="grid gap-2 px-4 py-3 text-sm" key={service.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-stone-950">{service.name}</p>
                    <p className="text-stone-600">
                      {service.durationMinutes} min
                      {service.priceCents !== null ? ` · ${(service.priceCents / 100).toFixed(2)} ${service.currency}` : ` · ${t("brain.priceOptional")}`}
                    </p>
                    {service.aliases.length > 0 ? (
                      <p className="text-stone-500">{service.aliases.join(", ")}</p>
                    ) : null}
                  </div>
                  {editingServiceId === service.id ? null : (
                    <button
                      className="rounded-md border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700"
                      onClick={() => startEditingService(service)}
                      type="button"
                    >
                      {t("brain.editService")}
                    </button>
                  )}
                </div>
                {editingServiceId === service.id ? (
                  <div className="grid gap-2 rounded-md border border-stone-200 bg-stone-50 p-3 md:grid-cols-[1fr_1fr_auto_auto]">
                    <input
                      className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                      onChange={(event) => setEditForm((current) => ({ ...current, durationMinutes: event.target.value }))}
                      placeholder={t("brain.durationMinutes")}
                      value={editForm.durationMinutes}
                    />
                    <input
                      className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                      onChange={(event) => setEditForm((current) => ({ ...current, priceEuros: event.target.value }))}
                      placeholder={t("brain.priceEurosPlaceholder")}
                      value={editForm.priceEuros}
                    />
                    <button
                      className="rounded-md bg-stone-950 px-3 py-2 text-sm font-medium text-white"
                      onClick={() => void saveServiceEdits(service.id)}
                      type="button"
                    >
                      {t("brain.saveService")}
                    </button>
                    <button
                      className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800"
                      onClick={() => setEditingServiceId(null)}
                      type="button"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">{t("brain.emptyServices")}</p>
        )}

        <div className="grid gap-3 rounded-lg border border-dashed border-stone-300 bg-white p-4 md:grid-cols-2">
          <input
            className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value }))}
            placeholder={t("brain.serviceName")}
            value={serviceForm.name}
          />
          <input
            className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            onChange={(event) => setServiceForm((current) => ({ ...current, slug: event.target.value }))}
            placeholder={t("brain.serviceSlug")}
            value={serviceForm.slug}
          />
          <input
            className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            onChange={(event) => setServiceForm((current) => ({ ...current, durationMinutes: event.target.value }))}
            placeholder={t("brain.durationMinutes")}
            value={serviceForm.durationMinutes}
          />
          <input
            className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            onChange={(event) => setServiceForm((current) => ({ ...current, priceEuros: event.target.value }))}
            placeholder={t("brain.priceEurosPlaceholder")}
            value={serviceForm.priceEuros}
          />
          <input
            className="rounded-md border border-stone-300 px-3 py-2 text-sm md:col-span-2"
            onChange={(event) => setServiceForm((current) => ({ ...current, aliases: event.target.value }))}
            placeholder={t("brain.aliases")}
            value={serviceForm.aliases}
          />
          <button
            className="w-fit rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 md:col-span-2"
            onClick={() => void addService()}
            type="button"
          >
            {t("brain.addService")}
          </button>
        </div>
      </div>
    </div>
  );
}
