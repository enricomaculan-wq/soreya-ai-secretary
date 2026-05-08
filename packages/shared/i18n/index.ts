import { en } from "./en";
import { it } from "./it";

export type SupportedLocale = "it" | "en";
export type Dictionary = Record<string, unknown>;

export const DEFAULT_LOCALE: SupportedLocale = "it";
export const supportedLocales = ["it", "en"] as const satisfies readonly SupportedLocale[];

const dictionaries: Record<SupportedLocale, Dictionary> = {
  it,
  en,
};

export function resolveLocale(input: unknown): SupportedLocale {
  if (typeof input !== "string") {
    return DEFAULT_LOCALE;
  }

  const normalized = input.trim().toLowerCase().split(/[-_]/)[0];
  return supportedLocales.includes(normalized as SupportedLocale)
    ? normalized as SupportedLocale
    : DEFAULT_LOCALE;
}

export function getDictionary(locale: unknown): Dictionary {
  return dictionaries[resolveLocale(locale)];
}

export function t(dictionary: Dictionary, key: string, params?: Record<string, string | number | boolean | null | undefined>): string {
  const value = key.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    return (current as Record<string, unknown>)[part];
  }, dictionary);

  const template = typeof value === "string" ? value : key;

  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const replacement = params[name];
    return replacement === null || replacement === undefined ? "" : String(replacement);
  });
}

export function labelFor(dictionary: Dictionary, group: string, value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const label = t(dictionary, `labels.${group}.${value}`);
  return label === `labels.${group}.${value}` ? value : label;
}
