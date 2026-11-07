"use client";

import { Lock } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { maskContact } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { useEmChat } from "../ChatProvider";

const PHONE_OR_EMAIL = /^(\S+@\S+\.\S+|[\d\s()+-]{8,})$/;

/**
 * Mini-formulário LGPD exibido antes de mostrar um pedido. Os dados completos vão só no
 * corpo da requisição desta consulta; no histórico fica a versão mascarada.
 */
export function IdentityForm({ locked }: { locked?: boolean }) {
  const { sendText } = useEmChat();
  const { t } = useI18n();
  const f = t.identity;
  const id = useId();
  const [order, setOrder] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const disabled = locked || sent;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const pedido = order.replace(/\D/g, "");
    if (!pedido) return setError(f.errOrder);
    if (!PHONE_OR_EMAIL.test(contact.trim())) return setError(f.errContact);
    setError(null);
    setSent(true);
    const mask = maskContact(contact);
    const shown = mask.kind === "phone" ? f.phoneEnding(mask.masked) : f.emailMasked(mask.masked);
    sendText(f.masked(pedido, shown), { pedido, contato: contact.trim() });
  };

  const inputClass =
    "h-[46px] rounded-[10px] border-[1.5px] border-em-line-strong bg-em-input px-3.5 text-base text-em-text outline-none placeholder:text-em-faint focus:border-em-accent focus:shadow-[0_0_0_3px_rgba(255,122,69,0.25)] disabled:opacity-60";

  return (
    <form
      onSubmit={submit}
      aria-describedby={`${id}-desc`}
      className="flex max-w-[440px] flex-col gap-3 rounded-2xl border border-em-line bg-em-card p-3.5"
    >
      <div className="flex items-center gap-2.5">
        <span className="inline-flex size-9 items-center justify-center rounded-[10px] bg-em-surface-2 text-em-accent-text">
          <Lock size={18} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="flex flex-col">
          <span className="font-semibold">{f.title}</span>
          <span id={`${id}-desc`} className="text-xs text-em-muted">
            {f.subtitle}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-order`} className="text-[13px] font-semibold">
          {f.order}
        </label>
        <input
          id={`${id}-order`}
          inputMode="numeric"
          autoComplete="off"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          disabled={disabled}
          placeholder={f.orderPlaceholder}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-contact`} className="text-[13px] font-semibold">
          {f.contact}
        </label>
        <input
          id={`${id}-contact`}
          autoComplete="off"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          disabled={disabled}
          placeholder={f.contactPlaceholder}
          className={inputClass}
        />
      </div>
      {error && (
        <p role="alert" className="m-0 text-[13px] font-semibold text-em-err-icon-fg">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={disabled}
        className={cn(
          "h-12 rounded-xl bg-em-accent text-[15px] font-semibold text-em-on-accent",
          disabled && "cursor-default opacity-60",
        )}
      >
        {disabled ? f.sent : f.submit}
      </button>
      <span className="text-center text-xs text-em-muted">{f.hint}</span>
    </form>
  );
}
