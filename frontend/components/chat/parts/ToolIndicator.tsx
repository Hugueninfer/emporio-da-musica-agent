"use client";

import { AlertTriangle, Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { toolMeta } from "@/lib/tools";
import { cn } from "@/lib/utils";

export type ToolState = "input-streaming" | "input-available" | "output-available" | "output-error" | string;

interface ToolIndicatorProps {
  name: string;
  state: ToolState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

/** Pill compacta do estado da ferramenta; expande para os detalhes técnicos (útil em demo). */
export function ToolIndicator({ name, state, input, output, errorText }: ToolIndicatorProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const done = state === "output-available";
  const failed = state === "output-error";
  const meta = toolMeta(t, name, done ? output : undefined);
  const summary = done ? meta.summary : undefined;
  const label = failed ? t.tools.error : done ? meta.done : meta.running;

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={detailsId}
        className="inline-flex min-h-9 items-center gap-2 rounded-full border border-em-line-strong bg-em-surface py-[5px] pl-[7px] pr-3 text-[13px] font-medium text-em-text"
      >
        <span
          className={cn(
            "inline-flex size-[22px] items-center justify-center rounded-full",
            done && "bg-em-ok-chip-bg text-em-ok-chip-fg",
            failed && "bg-em-err-icon-bg text-em-err-icon-fg",
            !done && !failed && "bg-em-surface-2 text-em-accent-text",
          )}
        >
          {done && <Check size={13} strokeWidth={2.8} aria-hidden="true" />}
          {failed && <AlertTriangle size={13} strokeWidth={2.2} aria-hidden="true" />}
          {!done && !failed && <Loader2 size={13} strokeWidth={2.4} className="animate-spin" aria-hidden="true" />}
        </span>
        <span aria-live="polite">{label}</span>
        {summary && <span className="text-em-muted">· {summary}</span>}
        {open ? (
          <ChevronUp size={15} className="text-em-muted" aria-hidden="true" />
        ) : (
          <ChevronDown size={15} className="text-em-muted" aria-hidden="true" />
        )}
      </button>
      {open && (
        <dl
          id={detailsId}
          className="grid w-full max-w-[560px] grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-0.5 rounded-xl border border-em-line bg-em-surface px-3.5 py-3 font-mono text-xs leading-relaxed text-em-text-2"
        >
          <dt className="text-em-faint">{t.tools.detail.tool}</dt>
          <dd className="break-all">{name}</dd>
          <dt className="text-em-faint">{t.tools.detail.input}</dt>
          <dd className="break-all">{input === undefined ? "—" : JSON.stringify(input)}</dd>
          <dt className="text-em-faint">{t.tools.detail.status}</dt>
          <dd className={cn(done && "text-em-ok-chip-fg", failed && "text-em-err-icon-fg")}>
            {t.tools.status[state] ?? state}
            {summary ? ` · ${summary}` : ""}
            {failed && errorText ? ` · ${errorText}` : ""}
          </dd>
        </dl>
      )}
    </div>
  );
}
