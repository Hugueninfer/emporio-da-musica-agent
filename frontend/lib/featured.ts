import type { Finish, Product } from "./catalog";
// TODO(backend): trocar o mock por uma rota do backend (ex.: GET /produtos/destaques).
import { CATALOG } from "./mock/catalog";

function byId(id: number): Product {
  const product = CATALOG.find((p) => p.id === id);
  if (!product) throw new Error(`Produto ${id} não está no catálogo`);
  return product;
}

/** Produtos com render 360° (um por acabamento). */
export const FEATURED: Record<Finish, Product> = {
  natural: byId(95),
  spruce: byId(90),
  sunburst: byId(96),
  uke: byId(121),
};

/** Acabamentos do configurador "Escolha o seu" (só violões). Nomes vêm do dicionário (t.finishes). */
export const CONFIG_FINISHES = [
  { finish: "natural", swatch: "#C98D4E" },
  { finish: "spruce", swatch: "#E8C68E" },
  { finish: "sunburst", swatch: "radial-gradient(circle at 50% 45%, #F4C670 0 22%, #DC8C2C 45%, #7A2C0E 75%, #2A1008)" },
] as const satisfies readonly { finish: Finish; swatch: string }[];

export type ConfigFinish = (typeof CONFIG_FINISHES)[number];
