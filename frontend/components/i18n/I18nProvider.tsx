"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
import { en } from "@/lib/i18n/en";
import { makeFormat, type Format } from "@/lib/i18n/format";
import { pt, type Dictionary } from "@/lib/i18n/pt";

// Os dicionários têm funções (interpolação), então ficam no cliente e só o código do idioma
// atravessa a fronteira servidor → cliente.
const DICTIONARIES: Record<Locale, Dictionary> = { en, pt };

interface I18n {
  locale: Locale;
  t: Dictionary;
  fmt: Format;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: DICTIONARIES[locale], fmt: makeFormat(locale) }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n precisa estar dentro de <I18nProvider>");
  return ctx;
}
