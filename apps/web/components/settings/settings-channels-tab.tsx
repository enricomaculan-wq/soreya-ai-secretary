"use client";

import type { SettingsChannelId } from "@soreya/shared";
import { useState } from "react";

import { useI18n } from "@/lib/i18n";

import { SettingsChannelCard } from "./settings-channel-card";
import { SettingsChannelDrawer } from "./settings-channel-drawer";
import { EMPTY_STATE_QUICK_PICKS, ChannelIcon } from "./settings-channel-icons";
import { AddChannelMenu } from "./settings-channels-shared";
import type { useSettingsChannels } from "./settings-channels-shared";

type ChannelsState = ReturnType<typeof useSettingsChannels>;

export function SettingsChannelsTab({
  channels,
  configChannelId,
  onConfigChannel,
  addMenuOpen,
  onAddMenuOpenChange,
}: {
  channels: ChannelsState;
  configChannelId: SettingsChannelId | null;
  onConfigChannel: (channelId: SettingsChannelId | null) => void;
  addMenuOpen?: boolean;
  onAddMenuOpenChange?: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { addedChannels, statuses, isLoading, error, addChannel, removeChannel } = channels;
  const [pendingRemove, setPendingRemove] = useState<SettingsChannelId | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [quickPickLoading, setQuickPickLoading] = useState<SettingsChannelId | null>(null);

  async function handleRemove(channelId: SettingsChannelId) {
    setActionError(null);

    try {
      await removeChannel(channelId);
      if (configChannelId === channelId) {
        onConfigChannel(null);
      }
      setPendingRemove(null);
    } catch (removeError) {
      setActionError(removeError instanceof Error ? removeError.message : t("settings.hub.channels.feedback.genericError"));
    }
  }

  async function handleAdd(channelId: SettingsChannelId) {
    setActionError(null);

    try {
      await addChannel(channelId);
      onConfigChannel(channelId);
      onAddMenuOpenChange?.(false);
    } catch (addError) {
      setActionError(addError instanceof Error ? addError.message : t("settings.hub.channels.feedback.genericError"));
      throw addError;
    }
  }

  async function handleQuickPick(channelId: SettingsChannelId) {
    setQuickPickLoading(channelId);

    try {
      await handleAdd(channelId);
    } finally {
      setQuickPickLoading(null);
    }
  }

  return (
    <>
      <section className="space-y-6">
        <div className="soreya-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-stone-950">{t("settings.hub.channels.title")}</h2>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">{t("settings.hub.channels.subtitle")}</p>
            </div>
            {addedChannels.length > 0 ? (
              <AddChannelMenu
                addedChannels={addedChannels}
                onAdd={handleAdd}
                onOpenChange={onAddMenuOpenChange}
                open={addMenuOpen}
              />
            ) : null}
          </div>

          {isLoading ? <p className="mt-6 text-sm text-stone-500">{t("common.loading")}…</p> : null}
          {error ? <p className="mt-6 text-sm text-rose-700">{error}</p> : null}
          {actionError ? <p className="mt-6 text-sm text-rose-700">{actionError}</p> : null}

          {addedChannels.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {addedChannels.map((channelId) => (
                <SettingsChannelCard
                  channelId={channelId}
                  key={channelId}
                  onConfigure={() => onConfigChannel(channelId)}
                  status={statuses?.[channelId] ?? "setup"}
                />
              ))}
            </div>
          ) : null}

          {addedChannels.length === 0 && !isLoading ? (
            <div className="mt-8 rounded-2xl border border-dashed border-stone-200 bg-stone-50/80 px-5 py-8 text-center sm:px-8">
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-stone-950">{t("settings.hub.channels.emptyTitle")}</h3>
              <p className="mx-auto mt-2 max-w-md whitespace-pre-line text-sm leading-relaxed text-stone-600">
                {t("settings.hub.channels.emptyBody")}
              </p>

              <p className="mt-6 text-xs font-medium uppercase tracking-[0.06em] text-stone-500">
                {t("settings.hub.channels.emptyQuickPicks")}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                {EMPTY_STATE_QUICK_PICKS.map((channelId) => (
                  <button
                    className="inline-flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-stone-300 hover:shadow disabled:opacity-60"
                    disabled={quickPickLoading !== null}
                    key={channelId}
                    onClick={() => void handleQuickPick(channelId)}
                    type="button"
                  >
                    <ChannelIcon channelId={channelId} />
                    <span>
                      <span className="block text-sm font-medium text-stone-950">
                        {t(`settings.hub.channels.menu.${channelId}.title`)}
                      </span>
                      <span className="mt-0.5 block text-xs text-stone-500">
                        {quickPickLoading === channelId ? `${t("common.loading")}…` : t(`settings.hub.channels.menu.${channelId}.hint`)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-center">
                <AddChannelMenu
                  addedChannels={addedChannels}
                  onAdd={handleAdd}
                  onOpenChange={onAddMenuOpenChange}
                  open={addMenuOpen}
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <SettingsChannelDrawer
        channelId={configChannelId}
        onClose={() => onConfigChannel(null)}
        onRemove={(channelId) => setPendingRemove(channelId)}
      />

      {pendingRemove ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-stone-950">{t("settings.hub.channels.removeDialog.title")}</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-600">
              {t("settings.hub.channels.removeDialog.body")}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700"
                onClick={() => setPendingRemove(null)}
                type="button"
              >
                {t("settings.hub.channels.removeDialog.cancel")}
              </button>
              <button
                className="rounded-md bg-stone-950 px-4 py-2 text-sm font-medium text-white"
                onClick={() => void handleRemove(pendingRemove)}
                type="button"
              >
                {t("settings.hub.channels.removeDialog.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
