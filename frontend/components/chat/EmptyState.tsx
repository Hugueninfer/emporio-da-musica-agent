"use client";

import { MapPin, Package, RotateCcw, Search, Tag } from "lucide-react";
import { ClavePortrait } from "@/components/brand/ClavePortrait";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useEmChat } from "./ChatProvider";
import { SuggestionChips } from "./parts/SuggestionChips";

/** Ícones dos 5 exemplos de pergunta (os textos vêm de t.chat.starters, na mesma ordem). */
const STARTER_ICONS = [Search, Tag, MapPin, Package, RotateCcw];

/** Boas-vindas da página cheia. */
export function EmptyStateFull() {
  const { sendText } = useEmChat();
  const { t } = useI18n();
  return (
    <div className="flex min-h-full flex-col justify-center gap-7 py-10">
      <div className="flex flex-col gap-3.5">
        <ClavePortrait size={112} className="shadow-[0_0_0_3px_var(--em-line-strong)]" />
        <h2 className="m-0 font-display text-[clamp(32px,5vw,44px)] font-extrabold leading-[1.02] tracking-[-0.02em]">{t.chat.emptyTitle}</h2>
        <p className="m-0 max-w-[560px] text-[17px] text-em-text-2">{t.chat.emptyBody}</p>
      </div>
      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] font-semibold text-em-muted">{t.chat.tryAsking}</span>
        <div className="flex flex-wrap gap-2.5">
          {t.chat.starters.map((text, i) => {
            const Icon = STARTER_ICONS[i];
            return (
              <button
                key={text}
                type="button"
                onClick={() => sendText(text)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-em-line-strong bg-em-surface pl-3 pr-4 text-[15px] font-medium text-em-text hover:border-em-accent"
              >
                <Icon size={18} strokeWidth={1.7} className="text-em-accent-text" aria-hidden="true" />
                {text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Boas-vindas do widget: balão + chips. */
export function EmptyStateWidget() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3.5">
      <div className="max-w-[88%] self-start rounded-[16px_16px_16px_4px] bg-em-bubble-bot px-3.5 py-[11px]">{t.chat.greeting}</div>
      <SuggestionChips items={t.chat.starters} />
    </div>
  );
}
