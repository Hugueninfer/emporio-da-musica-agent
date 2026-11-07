"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import type { StoreStatus } from "@/lib/hours";
import type { Dictionary } from "@/lib/i18n/pt";
import { STORE } from "@/lib/store";
import { useStoreStatus } from "@/lib/use-store-status";
import { cn } from "@/lib/utils";

function Dot({ open }: { open: boolean | undefined }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2 shrink-0 rounded-full",
        open ? "bg-em-ok shadow-[0_0_0_3px_rgba(107,203,119,0.2)]" : "bg-[#9A8577]",
      )}
    />
  );
}

/** Status estruturado → { "Aberto agora", "fecha às 18h" } no idioma da página. */
export function statusText(t: Dictionary, status: StoreStatus): { label: string; detail: string } {
  if (status.open) return { label: t.hours.open, detail: t.hours.closesAt(status.closesAt ?? 18) };
  const o = status.opens;
  const detail = !o
    ? t.hours.callUs(STORE.phone)
    : o.when === "today"
      ? t.hours.opensToday(o.hour)
      : o.when === "tomorrow"
        ? t.hours.opensTomorrow(o.hour)
        : t.hours.opensOn(o.weekday, o.hour);
  return { label: t.hours.closed, detail };
}

/** "• Aberto agora · fecha às 18h". `detailClassName` permite esconder o detalhe no mobile. */
export function StoreStatusInline({ className, detailClassName }: { className?: string; detailClassName?: string }) {
  const { t } = useI18n();
  const status = useStoreStatus();
  const text = status && statusText(t, status);
  return (
    <span className={cn("inline-flex items-center gap-2 text-[13px] text-em-text-2", className)}>
      <Dot open={status?.open} />
      {text ? (
        <span>
          <strong className="font-semibold text-em-text">{text.label}</strong>
          <span className={detailClassName}> · {text.detail}</span>
        </span>
      ) : (
        <span>{t.hours.storeHours}</span>
      )}
    </span>
  );
}

/** Versão rótulo mono em caixa alta (linha técnica do hero): "● ABERTO AGORA · FECHA ÀS 18H". */
export function StoreStatusMono({ className }: { className?: string }) {
  const { t } = useI18n();
  const status = useStoreStatus();
  const text = status && statusText(t, status);
  return (
    <span className={cn("inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-em-muted", className)}>
      <Dot open={status?.open} />
      {text ? `${text.label} · ${text.detail}` : t.hours.storeHours}
    </span>
  );
}

export function StoreStatusPill({ className }: { className?: string }) {
  return (
    <StoreStatusInline
      className={cn("rounded-full bg-[rgba(244,233,220,0.06)] px-3 py-[7px]", className)}
      detailClassName="max-[860px]:hidden"
    />
  );
}
