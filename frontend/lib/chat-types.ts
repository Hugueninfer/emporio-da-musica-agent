import type { UIMessage } from "ai";

/** Partes de dados customizadas que o backend pode enviar (data-*). */
export type EmDataParts = {
  /** Chips de sugestão ao fim de uma resposta (ex.: fora de escopo). */
  suggestions: { items: string[] };
};

export type EmUIMessage = UIMessage<never, EmDataParts>;

/** Corpo extra enviado junto da mensagem quando o cliente preenche o formulário LGPD. */
export interface VerificationPayload {
  pedido: string;
  contato: string;
}

/** Saída da ferramenta consultar_politicas: a seção do manual citada, por id ("4.1"). */
export interface PolicySource {
  id: string;
  /** Texto original (PT), usado se o id não estiver no dicionário. */
  documento?: string;
  secao?: string;
}
