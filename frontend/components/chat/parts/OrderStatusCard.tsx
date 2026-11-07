"use client";

import { CalendarDays, Check, Copy, Truck, X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cancelReason, payment } from "@/lib/i18n/text";
import { ORDER_STATUS_STYLE, ORDER_STEPS, type Order } from "@/lib/orders";
import { cn } from "@/lib/utils";

function CopyButton({ value }: { value: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Sem permissão de clipboard: o código continua visível para copiar à mão.
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? t.order.copiedLabel : t.order.copyLabel}
      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] border border-em-line-strong bg-em-card px-3 text-[13px] font-semibold text-em-text"
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      <span aria-live="polite">{copied ? t.order.copied : t.order.copy}</span>
    </button>
  );
}

function Timeline({ order }: { order: Order }) {
  const { t } = useI18n();
  const cancelled = order.status === "cancelled";
  // Pedido cancelado: a linha para em "Pendente", o ponto em que ele foi interrompido.
  const current = cancelled ? 0 : ORDER_STEPS.findIndex((s) => s === order.status);

  return (
    <ol
      aria-label={t.order.progress}
      className="m-0 grid list-none grid-cols-4 border-y border-em-line bg-em-surface-2 px-2.5 pb-4 pt-3.5"
    >
      {ORDER_STEPS.map((step, i) => {
        const done = !cancelled && i < current;
        const isCurrent = i === current;
        const isLast = i === ORDER_STEPS.length - 1;
        return (
          <li
            key={step}
            aria-current={isCurrent ? "step" : undefined}
            className="relative flex flex-col items-center gap-1.5"
          >
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-1/2 top-[13px] h-[3px] w-full",
                  done ? "bg-[#8A4428]" : "bg-[repeating-linear-gradient(90deg,#C9AF8E_0_5px,transparent_5px_9px)] opacity-60",
                )}
              />
            )}
            <span
              className={cn(
                "relative flex size-7 items-center justify-center rounded-full",
                done && "bg-[#8A4428] text-[#FFF4E8]",
                isCurrent && !cancelled && "bg-em-accent text-em-on-accent shadow-[0_0_0_4px_rgba(255,122,69,0.25)]",
                isCurrent && cancelled && "bg-[#F6D9D2] text-[#8A2617]",
                !done && !isCurrent && "border-2 border-[#C9AF8E] bg-em-card",
              )}
            >
              {done && <Check size={14} strokeWidth={2.8} aria-hidden="true" />}
              {isCurrent && !cancelled && <Truck size={15} strokeWidth={2} aria-hidden="true" />}
              {isCurrent && cancelled && <X size={15} strokeWidth={2.4} aria-hidden="true" />}
            </span>
            <span className={cn("text-xs", isCurrent ? "font-bold text-em-text" : "text-em-muted")}>
              {isCurrent && cancelled ? t.order.status.cancelled : t.order.status[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderStatusCard({ order }: { order: Order }) {
  const { t, fmt } = useI18n();
  const style = ORDER_STATUS_STYLE[order.status];
  const items = order.itens.map((i) => (i.quantidade > 1 ? `${i.quantidade}× ${i.nome}` : i.nome)).join(", ");

  return (
    <section aria-label={t.order.aria(order.numero)} className="max-w-[560px] overflow-hidden rounded-[18px] border border-em-line bg-em-card">
      <div className="flex flex-col gap-2.5 px-3.5 pb-3 pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-xl font-bold">{t.order.title(order.numero)}</span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: style.bg, color: style.fg }}
          >
            {t.order.status[order.status]}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold">{items || t.order.items}</span>
          <span className="text-[13px] text-em-muted">
            <span className="tabular">{fmt.money(order.total)}</span> · {payment(t, order.pagamento)} · {t.order.placedOn(fmt.date(order.data))}
          </span>
        </div>
      </div>

      <Timeline order={order} />

      <div className="flex flex-col gap-3 p-3.5">
        {order.status === "cancelled" ? (
          <p className="m-0 rounded-xl bg-em-surface-2 px-3 py-2.5 text-sm">
            <span className="block text-xs text-em-muted">{t.order.cancelReason}</span>
            {cancelReason(t, order.motivo)}
          </p>
        ) : (
          <>
            {order.rastreio ? (
              <div className="flex items-center gap-2.5 rounded-xl bg-em-surface-2 py-2 pl-3 pr-2">
                <div className="flex min-w-0 grow flex-col">
                  <span className="text-xs text-em-muted">{t.order.tracking}</span>
                  <span className="font-mono text-[15px] font-medium tracking-[0.02em]">{order.rastreio}</span>
                </div>
                <CopyButton value={order.rastreio} />
              </div>
            ) : (
              <p className="m-0 text-sm text-em-muted">{t.order.trackingLater}</p>
            )}
            {order.previsao && (
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm text-em-text-2">
                  <CalendarDays size={18} strokeWidth={1.7} aria-hidden="true" />
                  {order.status === "delivered" ? t.order.deliveredOn : t.order.eta}
                </span>
                <span className="tabular font-bold">{fmt.date(order.previsao)}</span>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
