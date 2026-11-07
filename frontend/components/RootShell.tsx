import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { HTML_LANG, localePath, type Locale } from "@/lib/i18n/config";
import { en } from "@/lib/i18n/en";
import { pt } from "@/lib/i18n/pt";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
const instrument = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"] });

export const FONT_CLASSES = `${bricolage.variable} ${instrument.variable} ${jetbrains.variable} antialiased`;

export const viewport: Viewport = { themeColor: "#120B08" };

/** Metadados por idioma, com os links alternativos (hreflang) para o outro idioma. */
export function localeMetadata(locale: Locale): Metadata {
  const t = locale === "en" ? en : pt;
  return {
    title: t.meta.title,
    description: t.meta.description,
    alternates: { languages: { en: localePath("en", "/"), "pt-BR": localePath("pt", "/") } },
  };
}

/** Esqueleto comum dos layouts raiz (um por idioma): <html lang>, fontes e providers. */
export function RootShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <html lang={HTML_LANG[locale]} className={FONT_CLASSES}>
      <body className="min-h-dvh">
        <I18nProvider locale={locale}>
          <ChatProvider>{children}</ChatProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
