"use client";

import type { SettingsChannelId } from "@soreya/shared";
import { SETTINGS_CHANNEL_IDS } from "@soreya/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import { useI18n } from "@/lib/i18n";

const MICROSOFT_CHANNELS: SettingsChannelId[] = ["email-microsoft", "calendar-microsoft"];

type ChannelsResponse = {
  addedChannels?: SettingsChannelId[];
  statuses?: Partial<Record<SettingsChannelId, "active" | "setup" | "paused" | "error">>;
  error?: string;
};

export function useSettingsChannels() {
  const [addedChannels, setAddedChannels] = useState<SettingsChannelId[]>([]);
  const [statuses, setStatuses] = useState<ChannelsResponse["statuses"]>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChannels = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch("/api/organization/channels");
      const payload = (await response.json()) as ChannelsResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load channels.");
      }

      setAddedChannels(payload.addedChannels ?? []);
      setStatuses(payload.statuses ?? {});
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load channels.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadChannels());
  }, [loadChannels]);

  async function addChannel(channelId: SettingsChannelId) {
    const response = await fetch("/api/organization/channels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ add: channelId }),
    });
    const payload = (await response.json()) as ChannelsResponse;

    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to add channel.");
    }

    setAddedChannels(payload.addedChannels ?? []);
    setStatuses(payload.statuses ?? {});
  }

  async function removeChannel(channelId: SettingsChannelId) {
    const response = await fetch("/api/organization/channels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remove: channelId }),
    });
    const payload = (await response.json()) as ChannelsResponse;

    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to remove channel.");
    }

    setAddedChannels(payload.addedChannels ?? []);
    setStatuses(payload.statuses ?? {});
  }

  return {
    addedChannels,
    statuses,
    isLoading,
    error,
    loadChannels,
    addChannel,
    removeChannel,
  };
}

export function AddChannelMenu({
  addedChannels,
  onAdd,
  className = "",
  open,
  onOpenChange,
}: {
  addedChannels: SettingsChannelId[];
  onAdd: (channelId: SettingsChannelId) => Promise<void>;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;
  const [isAdding, setIsAdding] = useState<SettingsChannelId | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsOpen]);

  async function handleAdd(channelId: SettingsChannelId) {
    setIsAdding(channelId);

    try {
      await onAdd(channelId);
      setIsOpen(false);
    } finally {
      setIsAdding(null);
    }
  }

  const primaryChannels = SETTINGS_CHANNEL_IDS.filter((id) => !MICROSOFT_CHANNELS.includes(id));
  const optionalChannels = SETTINGS_CHANNEL_IDS.filter((id) => MICROSOFT_CHANNELS.includes(id));

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        className="soreya-btn-primary px-4 py-2 text-sm"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        {t("settings.hub.channels.addChannel")}
      </button>

      {isOpen ? (
        <div className="absolute left-0 z-20 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
          <p className="px-3 py-2 text-xs font-medium uppercase tracking-[0.06em] text-stone-500">
            {t("settings.hub.channels.chooseChannel")}
          </p>
          <ul className="max-h-80 overflow-y-auto pb-1">
            {primaryChannels.map((channelId) => (
              <ChannelMenuItem
                added={addedChannels.includes(channelId)}
                channelId={channelId}
                isAdding={isAdding === channelId}
                key={channelId}
                onAdd={handleAdd}
              />
            ))}
          </ul>
          <p className="mt-2 px-3 py-2 text-xs font-medium uppercase tracking-[0.06em] text-stone-500">
            {t("settings.hub.channels.otherAccounts")}
          </p>
          <ul>
            {optionalChannels.map((channelId) => (
              <ChannelMenuItem
                added={addedChannels.includes(channelId)}
                channelId={channelId}
                isAdding={isAdding === channelId}
                key={channelId}
                onAdd={handleAdd}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ChannelMenuItem({
  channelId,
  added,
  isAdding,
  onAdd,
}: {
  channelId: SettingsChannelId;
  added: boolean;
  isAdding: boolean;
  onAdd: (channelId: SettingsChannelId) => Promise<void>;
}) {
  const { t } = useI18n();

  return (
    <li>
      <button
        className="flex w-full flex-col items-start rounded-lg px-3 py-2.5 text-left hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={added || isAdding}
        onClick={() => void onAdd(channelId)}
        type="button"
      >
        <span className="text-sm font-medium text-stone-950">{t(`settings.hub.channels.menu.${channelId}.title`)}</span>
        <span className="mt-0.5 text-xs text-stone-500">{t(`settings.hub.channels.menu.${channelId}.hint`)}</span>
        {added ? <span className="mt-1 text-xs text-stone-400">{t("settings.hub.channels.alreadyAdded")}</span> : null}
      </button>
    </li>
  );
}

export function ChannelStatusBadge({ status }: { status: "active" | "setup" | "paused" | "error" }) {
  const { t } = useI18n();
  const tone =
    status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "error"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : status === "paused"
          ? "border-stone-200 bg-stone-100 text-stone-600"
          : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {t(`settings.hub.channels.status.${status}`)}
    </span>
  );
}
