import type { NormalizedEmailMessage, NormalizedWhatsAppMessage, SupportedLocale } from '@soreya/shared';

import { getMobileDemoData } from '@/lib/demo-data';

export type MobileInboxItem =
  | {
      kind: 'email';
      id: string;
      title: string;
      preview: string;
      sender: string;
    }
  | {
      kind: 'whatsapp';
      id: string;
      title: string;
      preview: string;
      sender: string;
    };

export function buildMobileInboxItems(
  locale: SupportedLocale,
  translate: (key: string) => string,
): MobileInboxItem[] {
  const demo = getMobileDemoData(locale);

  return [
    ...demo.emailMessages.slice(0, 4).map((message: NormalizedEmailMessage) => ({
      kind: 'email' as const,
      id: `email-${message.providerMessageId}`,
      title: message.subject ?? translate('email.noSubject'),
      preview: message.snippet ?? message.bodyText ?? '',
      sender: message.fromName ?? message.fromEmail ?? translate('email.unknownSender'),
    })),
    ...demo.whatsappMessages.slice(0, 3).map((message: NormalizedWhatsAppMessage) => ({
      kind: 'whatsapp' as const,
      id: `wa-${message.providerMessageId}`,
      title: message.fromName ?? message.fromPhone ?? translate('labels.providers.whatsapp'),
      preview: message.textBody ?? '',
      sender: message.fromName ?? message.fromPhone ?? translate('email.unknownSender'),
    })),
  ];
}
