// Moeda e datas por idioma ficam em lib/i18n/format.ts.

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

/** Remove acentos e baixa a caixa, para buscas tolerantes. */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase();
}
