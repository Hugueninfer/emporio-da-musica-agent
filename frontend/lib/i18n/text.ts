// Tradução dos termos que vêm do sistema da loja (sempre em PT) para o idioma da página.
// Em PT os mapas são vazios e tudo passa direto.
import type { PriceInfo, Product } from "../catalog";
import type { PolicySource } from "../chat-types";
import type { Dictionary } from "./pt";

export function campaign(t: Dictionary, label: string): string {
  return t.product.campaigns[label] ?? label;
}

export function offText(t: Dictionary, info: PriceInfo, withLabel = true): string {
  if (!info.percent) return "";
  return withLabel && info.promoLabel ? `−${info.percent}% · ${campaign(t, info.promoLabel)}` : `−${info.percent}%`;
}

export function specLabel(t: Dictionary, label: string): string {
  return t.product.specLabels[label] ?? label;
}

export function specValue(t: Dictionary, value: string): string {
  const direct = t.product.specValues[value];
  if (direct) return direct;
  const solid = value.match(/^(.*) Sólido$/);
  if (solid && Object.keys(t.product.specValues).length > 0) return t.product.solid(specValue(t, solid[1]));
  return value;
}

export function categoryLabel(t: Dictionary, raw: string): string {
  return raw
    .split(" · ")
    .map((token) => t.product.categoryTokens[token] ?? token)
    .join(" · ");
}

export function description(t: Dictionary, product: Product): string | undefined {
  return t.product.descriptions[product.id] ?? product.description;
}

export function payment(t: Dictionary, raw: string): string {
  if (t.order.payments[raw]) return t.order.payments[raw];
  const credit = raw.match(/^Crédito (\d+)x$/);
  if (credit && Object.keys(t.order.payments).length > 0) return `Credit card · ${credit[1]}x`;
  return raw;
}

export function cancelReason(t: Dictionary, raw: string | null): string {
  if (!raw) return t.order.noReason;
  return t.order.reasons[raw] ?? raw;
}

/** Fonte citada: pelo id da seção do manual; se o id for desconhecido, usa o texto que veio. */
export function policySource(t: Dictionary, src: PolicySource): { documento: string; secao: string } {
  return t.policies[src.id] ?? { documento: src.documento ?? "", secao: src.secao ?? src.id };
}
