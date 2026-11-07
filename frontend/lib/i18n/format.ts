import { INTL_LOCALE, type Locale } from "./config";

export interface Format {
  /** Sempre em reais (a loja é brasileira); muda só o formato: R$2,199.00 × R$ 2.199,00. */
  money: (value: number) => string;
  /** "2026-02-28" → "Feb 28, 2026" / "28/02/2026" (sem Date, evita deslocamento de fuso). */
  date: (iso: string) => string;
  time: (timestamp: number) => string;
  shortDay: (timestamp: number) => string;
}

export function money(value: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], { style: "currency", currency: "BRL" })
    .format(value)
    .replace(/ /g, locale === "pt" ? " " : "");
}

export function makeFormat(locale: Locale): Format {
  const intl = INTL_LOCALE[locale];
  return {
    money: (value) => money(value, locale),
    date: (iso) => {
      const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
      return new Intl.DateTimeFormat(intl, { day: "2-digit", month: locale === "en" ? "short" : "2-digit", year: "numeric", timeZone: "UTC" }).format(
        new Date(Date.UTC(y, m - 1, d)),
      );
    },
    time: (ts) => new Date(ts).toLocaleTimeString(intl, { hour: "2-digit", minute: "2-digit" }),
    shortDay: (ts) => new Date(ts).toLocaleDateString(intl, { day: "numeric", month: "short" }).replace(".", ""),
  };
}
