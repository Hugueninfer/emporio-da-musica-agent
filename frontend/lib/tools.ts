import { BookOpen, Clock, CreditCard, Package, Search, Tag, Wrench, type LucideIcon } from "lucide-react";
import type { Dictionary } from "./i18n/pt";

type ToolName =
  | "buscar_produtos"
  | "buscar_promocoes"
  | "calcular_pagamento"
  | "consultar_pedido"
  | "consultar_politicas"
  | "solicitar_verificacao"
  | "status_loja";

export interface ToolMeta {
  running: string;
  done: string;
  icon: LucideIcon;
  /** Resumo curto ao lado do rótulo de concluída, ex.: "3 resultados". */
  summary?: string;
  /** Não mostra indicador (a própria UI generativa já comunica). */
  hidden?: boolean;
}

function count(output: unknown, key: string): number | undefined {
  const list = (output as Record<string, unknown> | null)?.[key];
  return Array.isArray(list) ? list.length : undefined;
}

const ICONS: Record<ToolName, LucideIcon> = {
  buscar_produtos: Search,
  buscar_promocoes: Tag,
  calcular_pagamento: CreditCard,
  consultar_pedido: Package,
  consultar_politicas: BookOpen,
  solicitar_verificacao: Package,
  status_loja: Clock,
};

/** Nome real da tool no backend → rótulos (no idioma da página), ícone e resumo da saída. */
export function toolMeta(t: Dictionary, name: string, output?: unknown): ToolMeta {
  const known = name in ICONS ? (name as ToolName) : null;
  const labels = known ? t.tools[known] : t.tools.fallback;
  const n = count(output, "produtos");
  let summary: string | undefined;
  if (known === "buscar_produtos" && n !== undefined) summary = t.tools.results(n);
  if (known === "buscar_promocoes" && n !== undefined) summary = t.tools.deals(n);
  if (known === "consultar_pedido" && (output as { motivo?: string })?.motivo === "dados_nao_conferem") summary = t.tools.mismatch;
  return { ...labels, icon: known ? ICONS[known] : Wrench, summary, hidden: known === "solicitar_verificacao" };
}
