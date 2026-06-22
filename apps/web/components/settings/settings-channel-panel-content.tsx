"use client";

import type { SettingsChannelId } from "@soreya/shared";
import { Suspense } from "react";

import { ConnectedCalendarsPanel } from "@/components/calendar-panels";
import { EmailAccountsPanel } from "@/components/email-panels";
import { TelegramBotPanel } from "@/components/telegram-panels";
import { WebsiteChatPanel } from "@/components/website-chat-panels";
import { WebsiteFormPanel } from "@/components/website-form-panels";
import { WhatsAppBusinessPanel } from "@/components/whatsapp-panels";

export function SettingsChannelPanelContent({
  channelId,
  compact = true,
}: {
  channelId: SettingsChannelId;
  compact?: boolean;
}) {
  switch (channelId) {
    case "email-google":
      return (
        <Suspense fallback={null}>
          <EmailAccountsPanel compact={compact} providers={["gmail"]} />
        </Suspense>
      );
    case "email-microsoft":
      return (
        <Suspense fallback={null}>
          <EmailAccountsPanel compact={compact} providers={["microsoft"]} />
        </Suspense>
      );
    case "calendar-google":
      return (
        <Suspense fallback={null}>
          <ConnectedCalendarsPanel compact={compact} providers={["google"]} />
        </Suspense>
      );
    case "calendar-microsoft":
      return (
        <Suspense fallback={null}>
          <ConnectedCalendarsPanel compact={compact} providers={["microsoft"]} />
        </Suspense>
      );
    case "website-form":
      return <WebsiteFormPanel compact={compact} />;
    case "website-chat":
      return <WebsiteChatPanel compact={compact} />;
    case "whatsapp":
      return <WhatsAppBusinessPanel compact={compact} />;
    case "telegram":
      return <TelegramBotPanel compact={compact} />;
    default:
      return null;
  }
}
