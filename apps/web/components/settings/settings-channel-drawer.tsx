"use client";

import type { SettingsChannelId } from "@soreya/shared";
import { useEffect } from "react";

import { useI18n } from "@/lib/i18n";

import { ChannelIcon } from "./settings-channel-icons";
import { SettingsChannelPanelContent } from "./settings-channel-panel-content";

export function SettingsChannelDrawer({
  channelId,
  onClose,
  onRemove,
}: {
  channelId: SettingsChannelId | null;
  onClose: () => void;
  onRemove: (channelId: SettingsChannelId) => void;
}) {
  const { t } = useI18n();
  const isOpen = channelId !== null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!channelId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label={t("settings.hub.channels.drawerClose")}
        className="absolute inset-0 bg-stone-950/35 backdrop-blur-[1px]"
        onClick={onClose}
        type="button"
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <header className="flex items-start gap-4 border-b border-stone-100 px-5 py-5 sm:px-6">
          <ChannelIcon channelId={channelId} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-stone-500">
              {t("settings.hub.channels.drawerEyebrow")}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-stone-950">
              {t(`settings.hub.channels.menu.${channelId}.title`)}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              {t(`settings.hub.channels.menu.${channelId}.hint`)}
            </p>
          </div>
          <button
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
            onClick={onClose}
            type="button"
          >
            {t("settings.hub.channels.drawerClose")}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <SettingsChannelPanelContent channelId={channelId} />
        </div>

        <footer className="border-t border-stone-100 px-5 py-4 sm:px-6">
          <button
            className="text-sm text-stone-500 underline-offset-2 hover:text-rose-700 hover:underline"
            onClick={() => onRemove(channelId)}
            type="button"
          >
            {t("settings.hub.channels.removeChannel")}
          </button>
        </footer>
      </aside>
    </div>
  );
}
