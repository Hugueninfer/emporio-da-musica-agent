"use client";

import { ArrowUpRight } from "lucide-react";
import { useEmChat } from "@/components/chat/ChatProvider";
import { ClavePortrait } from "@/components/brand/ClavePortrait";
import { useI18n } from "@/components/i18n/I18nProvider";

/** 02 / Atendimento (creme mais escuro). */
export function Service() {
  const { setWidgetOpen } = useEmChat();
  const { t } = useI18n();
  const s = t.service;
  return (
    <section id="atendimento" className="scroll-mt-24 border-t border-em-cream-line bg-[#E7DBC9] py-28 text-em-ink max-[640px]:py-16">
      <div className="em-wrap grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-x-16 gap-y-10 max-[900px]:grid-cols-1">
        <div className="flex flex-col">
          <div className="relative mb-8 self-start">
            <ClavePortrait size={220} className="shadow-[0_24px_50px_rgba(34,21,15,0.28),0_0_0_6px_#F4E9DC] max-[640px]:!size-[180px]" />
            <span className="absolute -bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-em-ink px-3.5 py-1.5 text-xs font-semibold text-[#F4E9DC] shadow-[0_8px_20px_rgba(34,21,15,0.25)]">
              <span aria-hidden="true" className="em-live size-2 rounded-full bg-em-ok" />
              {t.chat.assistant} · {t.chat.online}
            </span>
          </div>
          <span className="font-mono text-[10.5px] tracking-[0.14em] text-em-ink-muted">{s.label}</span>
          <h2 className="mb-0 mt-5 whitespace-pre-line font-display text-[clamp(34px,3.4vw,46px)] font-bold leading-[1.04] tracking-[-0.03em]">
            {s.title}
          </h2>
          <p className="mb-0 mt-5 max-w-[340px] text-sm leading-relaxed text-em-ink-2">{s.body}</p>
          <button
            type="button"
            onClick={() => setWidgetOpen(true)}
            className="mt-7 inline-flex h-[46px] items-center gap-4 self-start rounded-[10px] bg-em-ink px-5 text-[13.5px] font-semibold text-[#F4E9DC]"
          >
            {s.cta}
            <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <ol className="m-0 flex list-none flex-col p-0">
          {s.steps.map((step, i) => (
            <li key={step.title} className="grid grid-cols-[48px_minmax(0,1fr)] border-t border-[#CDBBA2] py-7 last:border-b">
              <span className="pt-1.5 font-mono text-[10.5px] text-em-ink-muted">0{i + 1}</span>
              <div className="flex max-w-[460px] flex-col gap-2">
                <strong className="font-display text-[22px] font-semibold tracking-[-0.01em]">{step.title}</strong>
                <span className="text-[13.5px] leading-relaxed text-em-ink-2">{step.text}</span>
                <span className="text-xs text-em-ink-muted">{step.note}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
