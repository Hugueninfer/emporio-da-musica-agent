export const LOCALES = ["en", "pt"] as const;
export type Locale = (typeof LOCALES)[number];

/** Inglês é o padrão (rotas sem prefixo); português vive em /pt. */
export const DEFAULT_LOCALE: Locale = "en";

export const HTML_LANG: Record<Locale, string> = { en: "en", pt: "pt-BR" };
export const INTL_LOCALE: Record<Locale, string> = { en: "en-US", pt: "pt-BR" };

/** Caminho da mesma página em outro idioma: "/assistente" ↔ "/pt/assistente". */
export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}
