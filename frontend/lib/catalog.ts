import { roundMoney } from "./format";

export type Finish = "natural" | "spruce" | "sunburst" | "uke";
export type ProductStatus = "active" | "discontinued" | "coming_soon";

/**
 * Contrato do produto como a UI espera receber das ferramentas do agente
 * (buscar_produtos / buscar_promocoes).
 */
export interface Product {
  id: number;
  name: string;
  category: string;
  /** Rótulo curto em caixa alta, ex.: "VIOLÃO · DREADNOUGHT" */
  categoryLabel: string;
  price: number;
  stock: number;
  status: ProductStatus;
  description?: string;
  specs: { label: string; value: string }[];
  promo?: { percent: number; label: string };
  /** Tem modelo 3D (public/instrumentos/3d/) e foto de card com esse acabamento */
  finish?: Finish;
  /** Palavra-fantasma no painel "Em foco" (modelo curto) */
  ghost?: string;
}

export interface PriceInfo {
  current: number;
  original?: number;
  percent?: number;
  promoLabel?: string;
}

/** Regra de comunicação (políticas 6.2): promoção sempre com preço original e % juntos. */
export function priceInfo(p: Product): PriceInfo {
  if (!p.promo) return { current: p.price };
  return {
    current: roundMoney(p.price * (1 - p.promo.percent / 100)),
    original: p.price,
    percent: p.promo.percent,
    promoLabel: p.promo.label,
  };
}

export type StockKind = "in_stock" | "low" | "out" | "discontinued" | "coming_soon";

export const STOCK_STYLES: Record<StockKind, { bg: string; fg: string }> = {
  in_stock: { bg: "#DDEBD7", fg: "#2F5A2A" },
  low: { bg: "#FBE6BE", fg: "#6E4300" },
  out: { bg: "#F6D9D2", fg: "#8A2617" },
  discontinued: { bg: "#E8E3DE", fg: "#5A514A" },
  coming_soon: { bg: "#DCE7F5", fg: "#24477A" },
};

/** Situação de estoque (o texto do badge é montado na UI, no idioma da página). */
export function stockState(p: Product): { kind: StockKind; count: number } {
  if (p.status === "discontinued") return { kind: "discontinued", count: 0 };
  if (p.status === "coming_soon") return { kind: "coming_soon", count: 0 };
  if (p.stock <= 0) return { kind: "out", count: 0 };
  return { kind: p.stock <= 3 ? "low" : "in_stock", count: p.stock };
}

/** Pode ir pra sacola: ativo e com estoque. */
export function isBuyable(p: Product): boolean {
  return p.status === "active" && p.stock > 0;
}

/** Descontinuado ou "em breve" não têm preço de venda vigente: não mostramos. */
export function hasSellingPrice(p: Product): boolean {
  return p.status === "active";
}

export const CARD_IMAGES: Record<Finish, string> = {
  natural: "/instrumentos/card_natural.webp",
  spruce: "/instrumentos/card_spruce.webp",
  sunburst: "/instrumentos/card_sunburst.webp",
  uke: "/instrumentos/card_uke.webp",
};

/** Ângulo/inclinação padrão de cada instrumento quando aparece em foco (o ukulele 3D tem tamanho real, por isso escala maior). */
export const FINISH_POSE: Record<Finish, { frame: number; tilt: number; scale: number }> = {
  natural: { frame: 4, tilt: -12, scale: 1 },
  spruce: { frame: 32, tilt: 10, scale: 1 },
  sunburst: { frame: 3, tilt: -16, scale: 1 },
  uke: { frame: 4, tilt: -10, scale: 1.15 },
};
