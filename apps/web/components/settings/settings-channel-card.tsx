"use client";

import type { SettingsChannelId } from "@soreya/shared";
import type { SettingsChannelStatus } from "@soreya/shared";

import { useI18n } from "@/lib/i18n";

import { ChannelIcon } from "./settings-channel-icons";
import { ChannelStatusBadge } from "./settings-channels-shared";

function primaryActionKey(status: SettingsChannelStatus) {
  if (status === "active") {
    return "configure";
  }

  if (status === "error") {
    return "fix";
  }

  return "complete";
}

export function SettingsChannelCard({
  channelId,
  status,
  onConfigure,
}: {
  channelId: SettingsChannelId;
  status: SettingsChannelStatus;
  onConfigure: () => void;
}) {
  const { t } = useI18n();
  const actionKey = primaryActionKey(status);

  return (
    <article className="group rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className="flex items-start gap-4">
        <ChannelIcon channelId={channelId} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold tracking-[-0.02em] text-stone-950">
              {t(`settings.hub.channels.menu.${channelId}.title`)}
            </h3>
            <ChannelStatusBadge status={status} />
          </div>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">
            {t(`settings.hub.channels.menu.${channelId}.hint`)}
          </p>
          <p className="mt-2 text-xs font-medium text-stone-500">
            {t(`settings.hub.channels.statusMessage.${status}`)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          className={
            actionKey === "complete"
              ? "soreya-btn-primary px-4 py-2 text-sm"
              : "soreya-btn-secondary px-4 py-2 text-sm"
          }
          onClick={onConfigure}
          type="button"
        >
          {t(`settings.hub.channels.actions.${actionKey}`)}
        </button>
      </div>
    </article>
  );
}
