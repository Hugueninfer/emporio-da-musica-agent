// Dados institucionais da loja (fonte: data/políticas_da_loja.pdf, seção 1.2).
export const STORE = {
  name: "Empório da Música",
  founded: 2008,
  city: "Campo Grande/MS",
  phone: "(67) 3341-4444",
  /** Para quem está fora do Brasil (página em inglês). */
  phoneIntl: "+55 67 3341-4444",
  phoneHref: "tel:+556733414444",
  address: "Rua 14 de Maio, 3200 — Centro",
  cep: "79202-333",
} as const;

export const FULL_ADDRESS = `${STORE.address} · ${STORE.city}`;
