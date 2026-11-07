import { stockState, priceInfo, type Finish, type Product } from "@/lib/catalog";
import { FEATURED } from "@/lib/featured";
import type { Format } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/pt";
import { campaign } from "@/lib/i18n/text";
import { STORE } from "@/lib/store";

/**
 * Pose do instrumento no palco do hero. x em vw e y em vh a partir do centro da tela,
 * scale: 1 = violão com 78% da altura da tela (o ukulele é proporcional ao tamanho real),
 * tilt em graus, frame = ângulo do giro em passos de 10°.
 */
export interface Pose {
  x: number;
  y: number;
  scale: number;
  tilt: number;
  frame: number;
}

/** Parte fixa de cada capítulo: instrumento, pose e lado do texto. */
interface Stage {
  finish: Finish;
  /** Produto cujo preço aparece no bloco de preço (null = sem preço). */
  product: Product | null;
  /** Lado do texto no desktop (o instrumento fica do lado oposto). */
  side: "left" | "right";
  pose: Pose;
  poseMobile: Pose;
}

export interface Chapter extends Stage {
  n: string;
  tab: string;
  eyebrow: string;
  title: string;
  body: string;
  chips: readonly string[];
  ghost: string;
  note: string;
}

const gd20 = FEATURED.natural;
const ht100 = FEATURED.spruce;
const ck20 = FEATURED.uke;

export const STAGES: Stage[] = [
  {
    finish: "natural",
    product: gd20,
    side: "left",
    pose: { x: 19, y: 3, scale: 0.95, tilt: -14, frame: 4 },
    poseMobile: { x: 22, y: -19, scale: 0.6, tilt: -14, frame: 4 },
  },
  {
    finish: "spruce",
    product: ht100,
    side: "right",
    pose: { x: -17, y: 2, scale: 1.08, tilt: 10, frame: -4 },
    poseMobile: { x: -20, y: -19, scale: 0.64, tilt: 10, frame: -4 },
  },
  {
    finish: "uke",
    product: ck20,
    side: "left",
    pose: { x: 21, y: 1, scale: 1.1, tilt: -10, frame: 3 },
    poseMobile: { x: 20, y: -21, scale: 0.74, tilt: -10, frame: 3 },
  },
  {
    finish: "natural",
    product: null,
    side: "left",
    // Close: o tampo e a boca do violão ocupam o lado direito e vazam pela base.
    pose: { x: 12, y: 24, scale: 1.75, tilt: -32, frame: 1 },
    poseMobile: { x: 18, y: -10, scale: 1.0, tilt: -32, frame: 1 },
  },
  {
    finish: "sunburst",
    product: null,
    side: "left",
    pose: { x: 19, y: 3, scale: 0.95, tilt: -20, frame: -3 },
    poseMobile: { x: 22, y: -19, scale: 0.6, tilt: -20, frame: -3 },
  },
];

/** Capítulos 01–05 do hero no idioma da página. Preços, % e estoque vêm do catálogo, não do texto. */
export function buildChapters(t: Dictionary, fmt: Format, phone: string): Chapter[] {
  const h = t.hero;
  const ht = priceInfo(ht100);
  const ck = priceInfo(ck20);
  const texts = [
    { title: h.titles.ch1, body: h.bodies.ch1, note: h.inStock(gd20.stock) },
    {
      title: h.titles.ch2(ht.percent ?? 0),
      body: h.bodies.ch2(campaign(t, ht.promoLabel ?? ""), ht100.name, ht100.stock),
      note: `Crafter HT-100 · ${stockState(ht100).kind === "low" ? h.lastUnits(ht100.stock) : h.inStock(ht100.stock)}`,
    },
    {
      title: h.titles.ch3,
      body: h.bodies.ch3(ck20.name, ck.percent ?? 0, fmt.money(ck20.price), fmt.money(ck.current)),
      note: h.inStock(ck20.stock),
    },
    { title: h.titles.ch4, body: h.bodies.ch4, note: h.assistantNote(phone) },
    { title: h.titles.ch5, body: t.hours.shortLine, note: `${STORE.address} · ${phone}` },
  ];
  return STAGES.map((stage, i) => ({
    ...stage,
    ...texts[i],
    n: `0${i + 1}`,
    tab: h.tabs[i],
    eyebrow: h.eyebrows[i],
    chips: h.chips[i],
    ghost: h.ghosts[i],
  }));
}
