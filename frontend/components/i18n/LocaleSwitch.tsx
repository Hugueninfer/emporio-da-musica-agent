"use client";

import { usePathname } from "next/navigation";
import { localePath, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { useI18n } from "./I18nProvider";

/** Caminho sem o prefixo de idioma: "/pt/assistente" → "/assistente". */
function basePath(pathname: string): string {
  const stripped = pathname.replace(/^\/pt(?=\/|$)/, "");
  return stripped === "" ? "/" : stripped;
}

/**
 * Troca EN ↔ PT mantendo a página atual. É um <a> comum de propósito: cada idioma tem o
 * próprio layout raiz (<html lang>), então a troca recarrega a página. A conversa do
 * assistente fica salva no navegador e continua do outro lado.
 */
export function LocaleSwitch({ className }: { className?: string }) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const other: Locale = locale === "en" ? "pt" : "en";
  const href = localePath(other, basePath(pathname));

  return (
    <a
      // O href é o mesmo no servidor e no cliente (evita erro de hidratação); a seção
      // atual (#escolha etc.) só entra no clique, quando o hash já existe no navegador.
      href={href}
      onClick={(e) => {
        if (window.location.hash) e.currentTarget.href = href + window.location.hash;
      }}
      hrefLang={other === "pt" ? "pt-BR" : "en"}
      lang={other === "pt" ? "pt-BR" : "en"}
      aria-label={t.locale.switchLabel}
      className={cn(
        "inline-flex h-11 items-center gap-1.5 rounded-lg px-2.5 font-mono text-[11px] tracking-[0.12em] text-em-text-2 no-underline hover:text-em-accent-text",
        className,
      )}
    >
      <span className="font-semibold" aria-hidden="true">
        {t.locale.current}
      </span>
      <span aria-hidden="true">/</span>
      <span className="opacity-60" aria-hidden="true">
        {t.locale.switchTo}
      </span>
    </a>
  );
}
