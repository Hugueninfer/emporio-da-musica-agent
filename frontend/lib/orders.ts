export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

/** Contrato do pedido como a UI espera receber da ferramenta consultar_pedido. */
export interface Order {
  numero: number;
  status: OrderStatus;
  data: string;
  itens: { nome: string; quantidade: number }[];
  total: number;
  pagamento: string;
  rastreio: string | null;
  previsao: string | null;
  /** Motivo do cancelamento, quando houver */
  motivo: string | null;
}

export const ORDER_STEPS: Exclude<OrderStatus, "cancelled">[] = ["pending", "confirmed", "shipped", "delivered"];

export const ORDER_STATUS_STYLE: Record<OrderStatus, { bg: string; fg: string }> = {
  pending: { bg: "#FBE6BE", fg: "#6E4300" },
  confirmed: { bg: "#F1E7D8", fg: "#5A3A28" },
  shipped: { bg: "#DCE7F5", fg: "#24477A" },
  delivered: { bg: "#DDEBD7", fg: "#2F5A2A" },
  cancelled: { bg: "#F6D9D2", fg: "#8A2617" },
};

/** Contato mascarado para exibir no histórico: últimos 4 dígitos do telefone ou o e-mail encurtado. */
export function maskContact(contact: string): { kind: "phone" | "email"; masked: string } {
  const trimmed = contact.trim();
  if (trimmed.includes("@")) {
    const [user, domain] = trimmed.split("@");
    return { kind: "email", masked: `${user.slice(0, 2)}•••@${domain}` };
  }
  return { kind: "phone", masked: trimmed.replace(/\D/g, "").slice(-4) };
}
