"use client";

import { ArrowUpRight, Menu, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { AssistantAvatar, PickIcon } from "@/components/brand/Logo";
import { StoreStatusInline } from "@/components/brand/StoreHours";
import { useEmChat } from "@/components/chat/ChatProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { LocaleSwitch } from "@/components/i18n/LocaleSwitch";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { STORE } from "@/lib/store";
import { cn } from "@/lib/utils";

const LINKS = ["instrumentos", "atendimento", "escolha", "loja"] as const;

/** Seção visível no meio da tela, para marcar o link ativo. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit) setActive(hit.target.id);
        else if (window.scrollY < 200) setActive(null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

const SECTION_IDS = [...LINKS];

export function Nav() {
  const { setWidgetOpen, cartCount } = useEmChat();
  const [menuOpen, setMenuOpen] = useState(false);
  const active = useActiveSection(SECTION_IDS);
  const { t, locale } = useI18n();
  const bagLabel = cartCount ? t.nav.bag(cartCount) : t.nav.bagEmpty;
  const phone = locale === "en" ? STORE.phoneIntl : STORE.phone;

  const openAssistant = () => {
    setMenuOpen(false);
    setWidgetOpen(true);
  };

  return (
    <>
      <header className="em-wrap fixed inset-x-0 top-5 z-30 flex h-[62px] items-center gap-5 rounded-xl border border-[rgba(244,233,220,0.09)] bg-[rgba(24,15,11,0.91)] py-2 pl-[22px] pr-3.5 backdrop-blur-[16px] max-[640px]:top-3.5 max-[640px]:gap-2 max-[640px]:h-[60px] max-[640px]:pl-[18px] max-[640px]:pr-2">
        <a href="#topo" aria-label={t.brand.home} className="flex h-11 items-center gap-4 text-em-text no-underline max-[640px]:gap-3">
          <span className="flex items-center gap-2">
            <PickIcon size={24} />
            <span className="font-display text-[22px] font-extrabold leading-none tracking-[-0.04em]">EMPÓRIO</span>
          </span>
          <span aria-hidden="true" className="h-4 w-px bg-[rgba(244,233,220,0.2)] max-[480px]:hidden" />
          <span className="whitespace-nowrap font-mono text-[10.5px] font-medium tracking-[0.14em] text-em-muted max-[480px]:hidden">
            DA MÚSICA
          </span>
        </a>

        <nav aria-label={t.nav.mainAria} className="absolute left-1/2 flex -translate-x-1/2 gap-[29px] max-[1000px]:hidden">
          {LINKS.map((l) => (
            <a
              key={l}
              href={`#${l}`}
              aria-current={active === l ? "true" : undefined}
              className={cn(
                "flex h-11 items-center text-xs no-underline transition-colors",
                active === l ? "text-em-text" : "text-em-muted hover:text-em-text",
              )}
            >
              {t.nav.links[l]}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 max-[640px]:gap-1">
          <LocaleSwitch className="max-[640px]:hidden" />
          {/* Chamada principal: botão laranja cheio, com ponto "online" e halo pulsando. */}
          <button
            type="button"
            onClick={openAssistant}
            aria-label={t.nav.talk}
            className="em-attn group inline-flex h-11 items-center gap-2.5 rounded-full bg-em-accent py-1 pl-1.5 pr-4 text-[12.5px] font-bold text-em-on-accent transition-[filter,transform] hover:-translate-y-px hover:brightness-110 max-[640px]:size-11 max-[640px]:justify-center max-[640px]:p-[5px]"
          >
            <AssistantAvatar size={34} online dotRing="ring-em-accent" />
            <span className="whitespace-nowrap max-[640px]:hidden">{t.nav.talk}</span>
            <ArrowUpRight size={15} strokeWidth={2.2} aria-hidden="true" className="transition-transform group-hover:-translate-y-px group-hover:translate-x-px max-[640px]:hidden" />
          </button>
          <button
            type="button"
            aria-label={bagLabel}
            className="relative inline-flex size-11 items-center justify-center rounded-lg border border-[rgba(244,233,220,0.125)] text-em-text max-[1000px]:border-transparent"
          >
            <ShoppingBag size={18} strokeWidth={1.8} aria-hidden="true" />
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                className="tabular absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-em-accent px-1 text-[10.5px] font-bold text-em-on-accent"
              >
                {cartCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t.nav.openMenu}
            className="hidden size-11 items-center justify-center rounded-lg text-em-text max-[1000px]:inline-flex"
          >
            <Menu size={20} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="top" className="rounded-b-2xl border-em-line bg-em-surface px-5 pb-6 pt-5 text-em-text">
          <SheetTitle className="label-mono text-em-muted">{t.nav.menuTitle}</SheetTitle>
          <nav aria-label={t.nav.menuAria} className="flex flex-col">
            {LINKS.map((l, i) => (
              <a
                key={l}
                href={`#${l}`}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-14 items-baseline gap-4 border-b border-em-line font-display text-[28px] font-bold tracking-[-0.02em] text-em-text no-underline"
              >
                <span className="font-mono text-xs font-normal tracking-normal text-em-faint">0{i + 1}</span>
                {t.nav.links[l]}
              </a>
            ))}
          </nav>
          <button
            type="button"
            onClick={openAssistant}
            className="inline-flex h-[52px] items-center justify-center gap-2.5 rounded-[14px] bg-em-accent text-[15px] font-bold text-em-on-accent"
          >
            {t.nav.talk}
            <ArrowUpRight size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
            <StoreStatusInline />
            <LocaleSwitch />
            <a href={STORE.phoneHref} className="text-em-accent-text">
              {phone}
            </a>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
