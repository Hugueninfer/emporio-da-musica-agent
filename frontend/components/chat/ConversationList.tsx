"use client";

import { Plus, Search, Truck } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { groupOf, timeLabel, type ConversationGroup } from "@/lib/conversations";
import { normalize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useEmChat } from "./ChatProvider";

const GROUPS: ConversationGroup[] = ["today", "week", "older"];

/** Sidebar do chat: nova conversa, busca, histórico agrupado e atalho de pedido. */
export function ConversationList({ onNavigate }: { onNavigate?: () => void }) {
  const { conversations, activeId, newConversation, selectConversation, sendText } = useEmChat();
  const { t, fmt } = useI18n();
  const c = t.chat;
  const [query, setQuery] = useState("");
  const filtered = query ? conversations.filter((conv) => normalize(conv.title).includes(normalize(query))) : conversations;

  return (
    <div className="flex h-full flex-col gap-4 px-3.5 py-[18px]">
      <button
        type="button"
        onClick={() => {
          newConversation();
          onNavigate?.();
        }}
        className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-em-accent text-[15px] font-bold text-em-on-accent"
      >
        <Plus size={18} strokeWidth={2.2} aria-hidden="true" />
        {c.newChat}
      </button>

      <label className="flex h-[42px] shrink-0 items-center gap-2 rounded-xl border border-em-line bg-em-input px-3 text-em-muted">
        <Search size={16} strokeWidth={1.8} aria-hidden="true" />
        <span className="sr-only">{c.searchChats}</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={c.searchChats}
          className="min-w-0 grow border-0 bg-transparent text-sm text-em-text outline-none placeholder:text-em-muted"
        />
      </label>

      <nav aria-label={c.previousChats} className="flex min-h-0 grow flex-col gap-0.5 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="m-0 px-2.5 py-2 text-[13px] text-em-muted">
            {query ? c.noResults : c.emptyList}
          </p>
        )}
        {GROUPS.map((group) => {
          const items = filtered.filter((conv) => groupOf(conv.updatedAt) === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="flex flex-col gap-0.5">
              <span className="px-2.5 pb-2 pt-3 font-mono text-[11px] tracking-[0.12em] text-em-faint first:pt-1">{c.groups[group]}</span>
              {items.map((conv) => {
                const active = conv.id === activeId;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => {
                      selectConversation(conv.id);
                      onNavigate?.();
                    }}
                    className={cn(
                      "flex flex-col rounded-xl px-3 py-2.5 text-left text-em-text",
                      active ? "bg-em-surface-2 shadow-[inset_2px_0_0_var(--em-accent)]" : "hover:bg-em-surface-2/60",
                    )}
                  >
                    <span className={cn("truncate text-sm", active && "font-semibold")}>{conv.title}</span>
                    <span className="text-xs text-em-muted">{timeLabel(conv.updatedAt, fmt, c.yesterday)}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="flex shrink-0 flex-col gap-2.5 rounded-2xl border border-em-line bg-em-input p-3.5">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <Truck size={16} strokeWidth={1.8} className="text-em-accent" aria-hidden="true" />
          {c.trackOrder}
        </span>
        <span className="text-[13px] text-em-muted">{c.trackOrderBody}</span>
        <button
          type="button"
          onClick={() => {
            sendText(c.trackOrderMessage);
            onNavigate?.();
          }}
          className="h-10 rounded-[10px] border border-em-line-strong text-[13px] font-semibold text-em-text"
        >
          {c.trackOrderCta}
        </button>
      </div>
    </div>
  );
}
