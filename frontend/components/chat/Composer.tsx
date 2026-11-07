"use client";

import { useChat } from "@ai-sdk/react";
import { ArrowUp, Square } from "lucide-react";
import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useEmChat } from "./ChatProvider";

export function Composer({ variant = "full", autoFocus = false }: { variant?: "full" | "widget"; autoFocus?: boolean }) {
  const { chat, sendText } = useEmChat();
  const { status, stop } = useChat({ chat });
  const { t } = useI18n();
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const busy = status === "submitted" || status === "streaming";

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (busy || !text.trim()) return;
    sendText(text);
    setText("");
    requestAnimationFrame(resize);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const full = variant === "full";

  return (
    <form
      onSubmit={submit}
      className={cn(
        "flex items-end gap-2.5 border-em-line-strong",
        full
          ? "rounded-[20px] border-[1.5px] bg-em-surface py-2 pl-[18px] pr-2 shadow-[0_14px_34px_rgba(0,0,0,0.35)] [[data-theme=light]_&]:shadow-[0_6px_20px_rgba(59,30,20,0.06)]"
          : "rounded-2xl border bg-em-bg py-1 pl-3.5 pr-1",
      )}
    >
      <label htmlFor={id} className="sr-only">
        {t.chat.message}
      </label>
      <textarea
        id={id}
        ref={ref}
        rows={1}
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => {
          setText(e.target.value);
          resize();
        }}
        onKeyDown={onKeyDown}
        placeholder={full ? t.chat.placeholder : t.chat.placeholderShort}
        className={cn(
          "min-w-0 grow resize-none border-0 bg-transparent text-em-text outline-none placeholder:text-em-faint",
          full ? "min-h-7 py-2.5 text-[15px]" : "py-2.5 text-[15px] leading-5",
        )}
      />
      {busy ? (
        <button
          type="button"
          onClick={() => void stop()}
          aria-label={t.chat.stopLabel}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-[14px] border-[1.5px] border-[rgba(244,233,220,0.5)] font-semibold text-em-text [[data-theme=light]_&]:border-em-text/40",
            full ? "h-[46px] px-4 text-sm" : "size-11 justify-center rounded-xl",
          )}
        >
          <Square size={13} fill="currentColor" aria-hidden="true" />
          {full && t.chat.stop}
        </button>
      ) : (
        <button
          type="submit"
          aria-label={t.chat.send}
          disabled={!text.trim()}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-xl bg-em-accent text-em-on-accent transition-opacity disabled:opacity-40",
            full ? "size-[46px] rounded-[14px]" : "size-11",
          )}
        >
          <ArrowUp size={20} strokeWidth={2.2} aria-hidden="true" />
        </button>
      )}
    </form>
  );
}
