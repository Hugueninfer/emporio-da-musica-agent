"use client";

import { useChat } from "@ai-sdk/react";
import { ChevronDown, Maximize2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { AssistantAvatar } from "@/components/brand/Logo";
import { useI18n } from "@/components/i18n/I18nProvider";
import { localePath } from "@/lib/i18n/config";
import { STORE } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEmChat } from "./ChatProvider";
import { ChatSurfaceContext, type ChatSurface } from "./ChatSurface";
import { Composer } from "./Composer";
import { EmptyStateWidget } from "./EmptyState";
import { MessageList } from "./MessageList";

/** Lançador + painel flutuante do assistente (landing). Usa a mesma conversa da tela cheia. */
export function ChatWidget() {
  const router = useRouter();
  const { chat, widgetOpen, setWidgetOpen, setFocus } = useEmChat();
  const { messages } = useChat({ chat });
  const { t, locale } = useI18n();
  const assistantPath = localePath(locale, "/assistente");
  const scrollRef = useRef<HTMLDivElement>(null);

  const expand = () => {
    setWidgetOpen(false);
    router.push(assistantPath);
  };

  const surface = useMemo<ChatSurface>(
    () => ({
      variant: "widget",
      onViewProduct: (product) => {
        setFocus(product);
        setWidgetOpen(false);
        router.push(assistantPath);
      },
    }),
    [router, setFocus, setWidgetOpen, assistantPath],
  );

  useEffect(() => {
    if (!widgetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setWidgetOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [widgetOpen, setWidgetOpen]);

  return (
    <ChatSurfaceContext.Provider value={surface}>
      {widgetOpen && (
        <section
          aria-label={t.chat.widgetLabel}
          className={cn(
            "fixed bottom-24 right-6 z-40 flex h-[620px] max-h-[calc(100dvh-130px)] w-[392px] flex-col overflow-hidden rounded-3xl border border-[rgba(244,233,220,0.12)] bg-em-surface text-[14.5px] leading-normal text-em-text shadow-[0_30px_70px_rgba(0,0,0,0.5)]",
            "max-[640px]:inset-x-0 max-[640px]:bottom-0 max-[640px]:h-[88dvh] max-[640px]:max-h-none max-[640px]:w-auto max-[640px]:rounded-b-none",
          )}
        >
          <header className="flex items-center gap-3 border-b border-em-line bg-em-surface-2 py-3.5 pl-4 pr-3">
            <AssistantAvatar size={40} online />
            <span className="flex grow flex-col leading-tight">
              <strong className="font-display text-base font-bold">{t.chat.assistant}</strong>
              <span className="inline-flex items-center gap-1.5 text-xs text-em-muted">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-em-ok" />
                {t.chat.replies}
              </span>
            </span>
            <button
              type="button"
              onClick={expand}
              aria-label={t.chat.expand}
              className="inline-flex size-10 items-center justify-center rounded-[10px] text-em-text-2 hover:bg-white/5"
            >
              <Maximize2 size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setWidgetOpen(false)}
              aria-label={t.chat.close}
              className="inline-flex size-10 items-center justify-center rounded-[10px] text-em-text-2 hover:bg-white/5"
            >
              <X size={18} strokeWidth={1.9} aria-hidden="true" />
            </button>
          </header>

          <div ref={scrollRef} className="flex min-h-0 grow flex-col overflow-y-auto p-4">
            {messages.length === 0 ? <EmptyStateWidget /> : <MessageList scrollRef={scrollRef} className="gap-3.5" />}
          </div>

          <div className="flex flex-col gap-1.5 border-t border-em-line px-3 pb-3 pt-2.5">
            <Composer variant="widget" autoFocus />
            <span className="text-center text-[11px] leading-snug text-em-muted">
              {t.chat.footerShort}{" "}
              <a href={STORE.phoneHref} className="text-em-accent-text">
                {locale === "en" ? STORE.phoneIntl : STORE.phone}
              </a>
            </span>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setWidgetOpen(!widgetOpen)}
        aria-label={widgetOpen ? t.chat.minimizeWidget : t.chat.openWidget}
        aria-expanded={widgetOpen}
        className={cn(
          "fixed bottom-5 right-6 z-[41] inline-flex size-16 items-center justify-center rounded-full bg-em-accent text-em-on-accent shadow-[0_14px_30px_rgba(255,122,69,0.35)] transition-transform hover:-translate-y-0.5",
          !widgetOpen && "em-attn p-[3px]",
          widgetOpen && "max-[640px]:hidden",
        )}
      >
        {widgetOpen ? (
          <ChevronDown size={24} strokeWidth={2.2} aria-hidden="true" />
        ) : (
          <AssistantAvatar size={58} online dotRing="ring-em-accent" />
        )}
      </button>
    </ChatSurfaceContext.Provider>
  );
}
