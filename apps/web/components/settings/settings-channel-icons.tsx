import type { SettingsChannelId } from "@soreya/shared";

type ChannelVisual = {
  accentClass: string;
  iconClass: string;
  glyph: string;
};

const CHANNEL_VISUALS: Record<SettingsChannelId, ChannelVisual> = {
  "email-google": {
    accentClass: "bg-rose-50 text-rose-700 ring-rose-100",
    iconClass: "text-rose-600",
    glyph: "✉",
  },
  "calendar-google": {
    accentClass: "bg-sky-50 text-sky-700 ring-sky-100",
    iconClass: "text-sky-600",
    glyph: "📅",
  },
  "website-form": {
    accentClass: "bg-violet-50 text-violet-700 ring-violet-100",
    iconClass: "text-violet-600",
    glyph: "📝",
  },
  "website-chat": {
    accentClass: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    iconClass: "text-indigo-600",
    glyph: "💬",
  },
  whatsapp: {
    accentClass: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    iconClass: "text-emerald-600",
    glyph: "WA",
  },
  telegram: {
    accentClass: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    iconClass: "text-cyan-600",
    glyph: "TG",
  },
  "email-microsoft": {
    accentClass: "bg-blue-50 text-blue-700 ring-blue-100",
    iconClass: "text-blue-600",
    glyph: "✉",
  },
  "calendar-microsoft": {
    accentClass: "bg-blue-50 text-blue-700 ring-blue-100",
    iconClass: "text-blue-600",
    glyph: "📅",
  },
};

export const EMPTY_STATE_QUICK_PICKS = ["email-google", "whatsapp", "website-form"] as const satisfies readonly SettingsChannelId[];

export function ChannelIcon({ channelId, size = "md" }: { channelId: SettingsChannelId; size?: "md" | "lg" }) {
  const visual = CHANNEL_VISUALS[channelId];
  const sizeClass = size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl font-semibold ring-1 ${sizeClass} ${visual.accentClass}`}
    >
      <span className={visual.iconClass}>{visual.glyph}</span>
    </span>
  );
}
