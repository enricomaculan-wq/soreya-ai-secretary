"use client";

import { useState } from "react";

import { useI18n } from "@/lib/i18n";

export function WebsiteFormPreview() {
  const { t } = useI18n();

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-subtle)]">
        {t("websiteForm.preview.formLabel")}
      </p>
      <div className="mt-4 grid gap-3">
        <PreviewField label={t("websiteForm.preview.name")} placeholder={t("websiteForm.preview.namePlaceholder")} />
        <PreviewField label={t("websiteForm.preview.email")} placeholder={t("websiteForm.preview.emailPlaceholder")} type="email" />
        <PreviewField label={t("websiteForm.preview.phone")} placeholder={t("websiteForm.preview.phonePlaceholder")} />
        <PreviewField label={t("websiteForm.preview.service")} placeholder={t("websiteForm.preview.servicePlaceholder")} />
        <label className="grid gap-1.5 text-sm text-[var(--foreground)]">
          <span className="font-medium">{t("websiteForm.preview.message")}</span>
          <div className="min-h-24 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--ink-muted)]">
            {t("websiteForm.preview.messagePlaceholder")}
          </div>
        </label>
        <span className="soreya-btn-primary inline-flex w-fit px-4 py-2 text-sm">
          {t("websiteForm.preview.submit")}
        </span>
      </div>
    </div>
  );
}

export function WebsiteChatWidgetPreview() {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="relative min-h-[28rem] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-subtle)]">
        {t("websiteChat.preview.widgetLabel")}
      </p>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">{t("websiteChat.preview.hint")}</p>

      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-col items-end gap-3">
        {isOpen ? (
          <div className="pointer-events-auto flex w-full max-w-xs flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
            <div className="border-b border-stone-200 px-3.5 py-3 text-sm font-semibold text-stone-900">
              {t("websiteChat.preview.header")}
            </div>
            <div className="flex max-h-56 flex-col gap-2 overflow-auto bg-stone-50 p-3">
              <ChatBubble align="start" text={t("websiteChat.preview.visitorMessage")} />
              <ChatBubble align="end" text={t("websiteChat.preview.studioReply")} />
            </div>
            <div className="flex gap-2 border-t border-stone-200 p-3">
              <div className="flex-1 rounded-[10px] border border-stone-300 px-3 py-2 text-sm text-stone-400">
                {t("websiteChat.preview.inputPlaceholder")}
              </div>
              <span className="rounded-[10px] bg-stone-950 px-3.5 py-2 text-sm font-medium text-white">
                {t("websiteChat.preview.send")}
              </span>
            </div>
          </div>
        ) : null}

        <button
          className="pointer-events-auto rounded-full bg-stone-950 px-4 py-3 text-sm font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
          onClick={() => setIsOpen((open) => !open)}
          type="button"
        >
          {isOpen ? t("websiteChat.preview.close") : t("websiteChat.preview.open")}
        </button>
      </div>
    </div>
  );
}

function PreviewField({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder: string;
  type?: "text" | "email";
}) {
  return (
    <label className="grid gap-1.5 text-sm text-[var(--foreground)]">
      <span className="font-medium">{label}</span>
      <div
        className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--ink-muted)]"
        data-input-type={type}
      >
        {placeholder}
      </div>
    </label>
  );
}

function ChatBubble({ align, text }: { align: "start" | "end"; text: string }) {
  return (
    <div
      className={`max-w-[85%] rounded-xl border px-2.5 py-2 text-sm leading-relaxed ${
        align === "end"
          ? "ml-auto border-stone-950 bg-stone-950 text-white"
          : "border-stone-200 bg-white text-stone-900"
      }`}
    >
      {text}
    </div>
  );
}
