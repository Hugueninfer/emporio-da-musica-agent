"use client";

import { FileText } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { PolicySource } from "@/lib/chat-types";
import { policySource } from "@/lib/i18n/text";

/** Fonte da resposta: seção do manual de políticas usada pelo assistente. */
export function SourceChip({ source }: { source: PolicySource }) {
  const { t } = useI18n();
  const { documento, secao } = policySource(t, source);
  return (
    <span className="inline-flex min-h-8 items-start gap-2 self-start rounded-lg border border-em-line bg-em-surface px-3 py-1.5 text-[13px] text-em-text-2">
      <FileText size={15} strokeWidth={1.8} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>
        {t.chat.source} <strong className="font-semibold text-em-text">{documento}</strong> — {secao}
      </span>
    </span>
  );
}
