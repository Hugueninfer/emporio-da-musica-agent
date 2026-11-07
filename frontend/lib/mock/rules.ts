// Regras de pagamento do manual (seção 3), calculadas de forma determinística.
// O backend Python vai ter a mesma lógica; aqui é só para o mock do front.
import { roundMoney } from "../format";

/** Parcela mínima por faixa (3.1): até 3x ≥ R$ 50; 4x–6x ≥ R$ 80; 7x–12x ≥ R$ 100. */
export function minInstallment(n: number): number {
  if (n <= 3) return 50;
  if (n <= 6) return 80;
  return 100;
}

export function installmentOptions(total: number): { n: number; value: number }[] {
  const out: { n: number; value: number }[] = [];
  for (let n = 2; n <= 12; n++) {
    const value = roundMoney(total / n);
    if (value >= minInstallment(n)) out.push({ n, value });
  }
  return out;
}

/** PIX dá 5% sobre o preço de tabela, mas não acumula com promoção (6.2). */
export function pixPrice(listPrice: number, hasPromo: boolean): number | null {
  return hasPromo ? null : roundMoney(listPrice * 0.95);
}
