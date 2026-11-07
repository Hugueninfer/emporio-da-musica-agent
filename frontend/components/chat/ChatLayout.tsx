"use client";

import { useChat } from "@ai-sdk/react";
import { Menu, Minimize2, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { StoreStatusPill } from "@/components/brand/StoreHours";
import { useI18n } from "@/components/i18n/I18nProvider";
import { LocaleSwitch } from "@/components/i18n/LocaleSwitch";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { Product } from "@/lib/catalog";
import { localePath } from "@/lib/i18n/config";
import type { Format } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/pt";
import { STORE } from "@/lib/store";
import { useEmChat } from "./ChatProvider";
import { ChatSurfaceContext, type ChatSurface } from "./ChatSurface";
import { Composer } from "./Composer";
import { ConversationList } from "./ConversationList";
import { EmptyStateFull } from "./EmptyState";
import { FocusPanel } from "./FocusPanel";
import { MessageList } from "./MessageList";
import { SuggestionChips } from "./parts/SuggestionChips";

const THEME_KEY = "emporio.tema";
type Theme = "dark" | "light";

function useChatTheme() {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preferência salva no navegador
      if (localStorage.getItem(THEME_KEY) === "light") setTheme("light");
    } catch {}
  }, []);
  // O tema fica no <html> para valer também nos Sheets (renderizados em portal).
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [theme]);
  const toggle = () =>
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {}
      return next;
    });
  return { theme, toggle };
}

function conversationLabel(t: Dictionary, fmt: Format, createdAt?: number) {
  if (!createdAt) return t.chat.conversationNew;
  const today = new Date().toDateString() === new Date(createdAt).toDateString();
  const day = today ? t.chat.today : fmt.shortDay(createdAt).toUpperCase();
  return t.chat.conversationLabel(day, fmt.time(createdAt));
}

function shortName(p: Product) {
  return p.name.split(" ").slice(0, 2).join(" ");
}

export function ChatLayout() {
  const router = useRouter();
  const { chat, activeMeta, focus, setFocus, setWidgetOpen } = useEmChat();
  const { messages, status } = useChat({ chat });
  const { theme, toggle } = useChatTheme();
  const { t, fmt, locale } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusSheetOpen, setFocusSheetOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  const surface = useMemo<ChatSurface>(
    () => ({
      variant: "full",
      onViewProduct: (product) => {
        setFocus(product);
        // Sem a coluna "Em foco" (< 1240px), o produto abre num Sheet de baixo.
        if (!window.matchMedia("(min-width: 1240px)").matches) setFocusSheetOpen(true);
      },
    }),
    [setFocus],
  );

  const minimize = () => {
    setWidgetOpen(true);
    router.push(localePath(locale, "/"));
  };

  const followUps = t.chat.followUps(shortName(focus));
  // Se a última resposta já trouxe chips próprios, não repete sugestões acima do composer.
  const answerHasChips = messages.at(-1)?.parts.some((p) => p.type === "data-suggestions") ?? false;

  return (
    <ChatSurfaceContext.Provider value={surface}>
      <div className="flex h-dvh min-h-[560px] flex-col overflow-hidden bg-em-bg text-[15px] leading-[1.55] text-em-text">
        <header className="flex shrink-0 items-center gap-3.5 border-b border-em-line bg-em-header px-5 py-3 text-em-on-header max-[860px]:gap-2 max-[860px]:px-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label={t.chat.openChats}
            className="hidden size-11 shrink-0 items-center justify-center rounded-xl max-[860px]:inline-flex"
          >
            <Menu size={22} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <Link href={localePath(locale, "/")} aria-label={t.brand.home} className="text-inherit no-underline">
            <Logo className="max-[860px]:[&>span:last-child]:hidden" />
          </Link>
          <span aria-hidden="true" className="h-6 w-px bg-[rgba(244,233,220,0.14)] max-[860px]:hidden" />
          <span className="flex flex-col leading-tight max-[860px]:hidden">
            <strong className="text-sm">{t.chat.assistant}</strong>
            <span className="text-xs opacity-75">{t.chat.assistantRole}</span>
          </span>
          <StoreStatusPill className="ml-auto text-inherit max-[480px]:hidden [&_strong]:text-inherit" />
          <LocaleSwitch className="text-inherit opacity-80 hover:opacity-100 max-[480px]:hidden" />
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? t.chat.lightTheme : t.chat.darkTheme}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(244,233,220,0.14)] max-[480px]:ml-auto"
          >
            {theme === "dark" ? <Sun size={19} strokeWidth={1.8} aria-hidden="true" /> : <Moon size={19} strokeWidth={1.8} aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={minimize}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-[rgba(244,233,220,0.14)] px-3.5 text-sm font-semibold max-[860px]:px-3"
          >
            <Minimize2 size={17} strokeWidth={1.8} aria-hidden="true" />
            <span className="max-[860px]:sr-only">{t.chat.minimize}</span>
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="w-[272px] shrink-0 border-r border-em-line bg-em-sidebar max-[860px]:hidden">
            <ConversationList />
          </aside>

          <main className="flex min-w-0 flex-1 flex-col">
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto flex min-h-full max-w-[780px] flex-col gap-[26px] px-7 pb-6 pt-7 max-[860px]:px-3.5">
                {messages.length === 0 ? (
                  <EmptyStateFull />
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5 border-b border-em-line pb-[18px]">
                      <span className="label-mono text-em-muted">{conversationLabel(t, fmt, activeMeta?.createdAt)}</span>
                      <h1 className="m-0 font-display text-[34px] font-extrabold leading-none tracking-[-0.02em] max-[640px]:text-[26px]">
                        {activeMeta?.title ?? t.chat.newChat}
                      </h1>
                    </div>
                    <MessageList scrollRef={scrollRef} className="gap-[26px]" />
                  </>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-em-line px-7 pb-3.5 pt-2.5 max-[860px]:px-3.5">
              <div className="mx-auto flex max-w-[724px] flex-col gap-2.5">
                {messages.length > 0 && !answerHasChips && <SuggestionChips items={followUps} scroll disabled={busy} />}
                <Composer variant="full" />
                <div className="flex flex-wrap justify-between gap-3 text-xs text-em-muted">
                  <span>
                    {t.chat.footer}{" "}
                    <a href={STORE.phoneHref} className="text-em-accent-text">
                      {locale === "en" ? STORE.phoneIntl : STORE.phone}
                    </a>
                    .
                  </span>
                  <span className="max-[860px]:hidden">{t.chat.enterHint}</span>
                </div>
              </div>
            </div>
          </main>

          <aside aria-label={t.chat.focusLabel} className="w-[380px] shrink-0 overflow-y-auto border-l border-em-line bg-em-sidebar max-[1240px]:hidden">
            <FocusPanel product={focus} />
          </aside>
        </div>
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[300px] max-w-[85vw] bg-em-sidebar p-0 text-em-text">
          <SheetTitle className="sr-only">{t.chat.chats}</SheetTitle>
          <ConversationList onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <Sheet open={focusSheetOpen} onOpenChange={setFocusSheetOpen}>
        <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-em-sidebar p-0 text-em-text">
          <SheetTitle className="sr-only">{t.chat.focusLabel}</SheetTitle>
          <FocusPanel product={focus} stageHeight={360} />
        </SheetContent>
      </Sheet>
    </ChatSurfaceContext.Provider>
  );
}
