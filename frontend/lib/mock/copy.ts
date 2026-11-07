// Falas do agente MOCK em português e inglês. O agente real (LLM) escreve as próprias
// respostas no idioma do cliente; aqui é só para a demo da UI sem backend.
import "server-only";
import { STORE } from "../store";

type Money = (value: number) => string;

export const COPY = {
  pt: {
    checking: "Deixa eu ver isso pra você… só um instante, consultando",
    verifyIntro: "Claro, vamos ver! Antes, só preciso confirmar que o pedido é seu — é pra proteger seus dados.",
    orderNotFound: `Hmm, não consegui confirmar esses dados. Confere se o número do pedido e o telefone ou e-mail são os mesmos do cadastro? Se preferir, nossa equipe ajuda pelo **${STORE.phone}**.`,
    orderStatus: (name: string): Record<string, string> => ({
      shipped: `Prontinho, ${name}! Seu pedido já saiu daqui e tá a caminho — o código de rastreio tá aí em cima.`,
      delivered: `Achei, ${name}! Esse pedido já foi entregue. Espero que esteja curtindo o instrumento!`,
      confirmed: `Achei, ${name}! O pagamento foi confirmado e o pedido tá sendo preparado. O rastreio chega por e-mail e WhatsApp assim que despachar.`,
      pending: `Achei, ${name}! Esse pedido ainda está aguardando a confirmação do pagamento.`,
      cancelled: `Achei, ${name}. Esse pedido foi cancelado — o motivo tá no card aí em cima.`,
    }),
    orderOutro: "Qualquer coisa no caminho, é só me chamar aqui. Posso ajudar com mais alguma coisa?",
    manyMatches: (n: number) => `Achei ${n} modelos com esse nome. Dá uma olhada:`,
    discontinued: (name: string) => `O **${name}** saiu de linha e não faz mais parte do catálogo. Quer que eu te mostre modelos parecidos que estão disponíveis?`,
    comingSoon: (name: string) => `O **${name}** ainda não chegou — tá marcado como *em breve*. Posso te mostrar opções parecidas que já estão em estoque?`,
    soldOut: (name: string, price: string) =>
      `O **${name}** sai por **${price}**, mas esgotou no momento. Posso te avisar quando voltar, ou te mostrar alternativas parecidas que estão disponíveis.`,
    productPrice: (o: { name: string; price: string; old?: string; pct?: number; campaign?: string; stock: number; top?: string; has3d: boolean }) =>
      `O **${o.name}** ${
        o.old ? `tá com **${o.pct}% de desconto** (${o.campaign}): de ~~${o.old}~~ por **${o.price}**` : `sai por **${o.price}**`
      } e tem **${o.stock} ${o.stock === 1 ? "unidade" : "unidades"}** em estoque${o.top ? `. Tampo de ${o.top.toLowerCase()}` : ""}${
        o.has3d ? " — toca em **Ver em 3D** pra girar ele." : "."
      }`,
    paymentGeneral:
      "A gente aceita **Pix** (5% de desconto à vista), **débito**, **boleto** (compensa em até 3 dias úteis) e **crédito em até 12x sem juros**, respeitando a parcela mínima:\n\n- até 3x: parcela a partir de R$ 50,00\n- 4x a 6x: parcela a partir de R$ 80,00\n- 7x a 12x: parcela a partir de R$ 100,00\n\nO desconto do Pix não vale sobre preço que já está em promoção. Me fala o instrumento que eu calculo pra você!",
    installmentTable: (name: string, price: string, rows: string[], pixNote: string) =>
      `O **${name}** sai por **${price}**. Olha as opções:\n\n| Forma | Parcelas | Valor da parcela | Total |\n|---|---|--:|--:|\n${rows.join("\n")}\n\n${pixNote} Parcelamento sempre sem juros.`,
    rowPix: "Pix",
    rowDebit: "Débito ou boleto",
    rowCredit: "Crédito",
    pixSaves: (v: string) => `No Pix você economiza ${v} (5% à vista).`,
    pixNoStack: "Como ele já está em promoção, o desconto do Pix não acumula.",
    returns:
      "Pode sim, sem estresse! Pelo direito de arrependimento (compras online), funciona assim:\n\n- **Prazo:** até **7 dias corridos** depois que você recebeu o instrumento, sem precisar justificar.\n- **Estado:** na **embalagem original**, sem sinais de uso, com acessórios e manuais.\n- **Reembolso:** na mesma forma de pagamento, em até **10 dias úteis**.\n- **Frete:** por nossa conta — você não paga nada pra devolver.\n\nSe quiser, me passa o número do pedido que eu confiro as datas pra você.",
    defects:
      "Poxa, que chato! Produto com **defeito de fabricação** pode ser trocado em até **30 dias corridos** após a compra. Depois disso, a garantia é com o fabricante — e a gente pode intermediar pra você.\n\nSó não entram danos por mau uso, queda, umidade excessiva ou modificações não autorizadas. Quer que eu chame a equipe pra abrir a troca?",
    outOfScope: `Poxa, isso a gente não tem. Aqui na Empório o foco é só instrumento — violões, guitarras, baixos, baterias, teclados e ukuleles.\n\nPra cordas, cabos e outros acessórios, vale procurar uma loja parceira especializada. Se quiser uma indicação de confiança, nossa equipe te ajuda pelo **${STORE.phone}**.\n\nEnquanto isso, posso te mostrar:`,
    outOfScopeChips: ["Violões em promoção", "Ukuleles para começar"],
    address: `A gente fica na **${STORE.address}**, em Campo Grande/MS (CEP ${STORE.cep}). O telefone e WhatsApp é **${STORE.phone}**.\n\nAbrimos de segunda a sexta das 9h às 18h e sábado das 9h às 13h. Passa lá pra testar os instrumentos!`,
    hours:
      "Nosso horário é:\n\n- **Segunda a sexta:** 09:00 às 18:00\n- **Sábado:** 09:00 às 13:00\n- **Domingos e feriados:** fechado\n\nEm datas especiais (Black Friday, aniversário da loja, Natal) o horário pode ser estendido — a gente avisa nas redes sociais.",
    shipping:
      "Depende de onde você está:\n\n- **Campo Grande e região metropolitana:** frete grátis acima de R$ 500,00 (abaixo disso, R$ 35,00), entrega em 1 a 3 dias úteis pelo nosso motoboy.\n- **Outras cidades:** PAC (5 a 12 dias úteis), SEDEX (2 a 5) ou Jadlog (3 a 8), todos com rastreio e seguro. O valor sai pelo CEP, peso e tamanho.\n\nInstrumentos grandes (bateria acústica, piano digital) podem precisar de cotação especial. Pra qual cidade seria?",
    deals: (n: number) =>
      `Separei as **${n} ofertas ativas** agora. Lembrando: promoção vale enquanto durar o estoque, e o desconto do Pix não acumula com preço promocional.`,
    compare: (a: string, b: string, rows: string[]) =>
      `Bora comparar os dois folk de aço:\n\n| | ${a} | ${b} |\n|---|---|---|\n${rows.join("\n")}\n\nO cedro do Takamine costuma soar mais quente e encorpado; o spruce do Crafter é mais brilhante e com bastante projeção.`,
    compareRows: { price: "Preço", top: "Tampo", body: "Formato", stock: "Estoque" },
    notify: "Anotado! Assim que ele voltar ao estoque, a equipe te avisa pelo WhatsApp cadastrado.",
    noResults: "Não encontrei nada com esses filtros agora. Quer que eu amplie a faixa de preço ou procure em outra categoria?",
    searchResults: (n: number, promo?: { name: string; pct: number }, out?: string) =>
      `Boa! Separei **${n} ${n === 1 ? "opção" : "opções"}** nessa faixa.${promo ? ` O **${promo.name}** tá com **${promo.pct}% de desconto**.` : ""}${
        out ? ` O **${out}** esgotou, mas posso te avisar quando voltar.` : ""
      } Quer que eu compare alguma delas?`,
    fallback:
      "Hmm, essa eu não sei responder por aqui. Posso te ajudar com **instrumentos, preços, estoque, promoções, pedidos** e as **políticas da loja** (trocas, frete, pagamento e horários). Que tal começar por um destes?",
    fallbackChips: ["Quais violões até R$ 1.000?", "Ukuleles para começar", "Quero saber do meu pedido"],
    topics: { returns: "devolução por arrependimento", defects: "troca por defeito e garantia", payment: "formas de pagamento e parcelamento", store: "dados da loja", hours: "horário de funcionamento", shipping: "frete e entregas" },
  },
  en: {
    checking: "Let me look that up for you… one moment, checking",
    verifyIntro: "Sure, let's check! First I just need to confirm the order is yours — it keeps your data safe.",
    orderNotFound: `Hmm, I couldn't confirm those details. Could you check that the order number and the phone or email match what's on file? Our team can also help at **${STORE.phoneIntl}**.`,
    orderStatus: (name: string): Record<string, string> => ({
      shipped: `All set, ${name}! Your order has left the store and is on its way — the tracking code is right above.`,
      delivered: `Found it, ${name}! This order has already been delivered. Hope you're enjoying the instrument!`,
      confirmed: `Found it, ${name}! Payment is confirmed and your order is being prepared. Tracking goes out by email and WhatsApp as soon as it ships.`,
      pending: `Found it, ${name}! This order is still waiting for payment confirmation.`,
      cancelled: `Found it, ${name}. This order was cancelled — the reason is on the card above.`,
    }),
    orderOutro: "If anything comes up on the way, just message me here. Anything else I can help with?",
    manyMatches: (n: number) => `I found ${n} models with that name. Take a look:`,
    discontinued: (name: string) => `The **${name}** has been discontinued and is no longer in our catalog. Want me to show you similar models that are available?`,
    comingSoon: (name: string) => `The **${name}** hasn't arrived yet — it's marked as *coming soon*. Can I show you similar options that are in stock?`,
    soldOut: (name: string, price: string) =>
      `The **${name}** is **${price}**, but it's sold out right now. I can let you know when it's back, or show you similar alternatives that are available.`,
    productPrice: (o: { name: string; price: string; old?: string; pct?: number; campaign?: string; stock: number; top?: string; has3d: boolean }) =>
      `The **${o.name}** ${
        o.old ? `is **${o.pct}% off** (${o.campaign}): from ~~${o.old}~~ down to **${o.price}**` : `is **${o.price}**`
      } and we have **${o.stock} ${o.stock === 1 ? "unit" : "units"}** in stock${o.top ? `. It has a ${o.top.toLowerCase()} top` : ""}${
        o.has3d ? " — tap **View in 3D** to spin it." : "."
      }`,
    paymentGeneral:
      "We accept **Pix** (5% off, paid upfront), **debit**, **boleto** (clears within 3 business days) and **credit card in up to 12 interest-free installments**, with a minimum installment of:\n\n- up to 3x: R$50.00\n- 4x to 6x: R$80.00\n- 7x to 12x: R$100.00\n\nThe Pix discount doesn't apply to prices that are already on sale. Tell me the instrument and I'll work it out for you!",
    installmentTable: (name: string, price: string, rows: string[], pixNote: string) =>
      `The **${name}** is **${price}**. Here are your options:\n\n| Method | Installments | Per installment | Total |\n|---|---|--:|--:|\n${rows.join("\n")}\n\n${pixNote} Installments are always interest-free.`,
    rowPix: "Pix",
    rowDebit: "Debit or boleto",
    rowCredit: "Credit card",
    pixSaves: (v: string) => `With Pix you save ${v} (5% upfront).`,
    pixNoStack: "Since it's already on sale, the Pix discount doesn't stack.",
    returns:
      "Yes, no stress! Under the right of withdrawal (online purchases), here's how it works:\n\n- **Deadline:** up to **7 calendar days** after you receive the instrument, no reason needed.\n- **Condition:** in its **original packaging**, unused, with all accessories and manuals.\n- **Refund:** to the original payment method within **10 business days**.\n- **Shipping:** on us — returning it costs you nothing.\n\nIf you like, send me your order number and I'll check the dates for you.",
    defects:
      "Oh no, sorry about that! Items with a **manufacturing defect** can be exchanged within **30 calendar days** of purchase. After that, the manufacturer's warranty applies — and we can handle it for you.\n\nDamage from misuse, drops, excessive humidity or unauthorized modifications isn't covered. Want me to get the team to open the exchange?",
    outOfScope: `Sorry, we don't carry that. Here at Empório we focus on instruments only — acoustic guitars, electric guitars, basses, drums, keyboards and ukuleles.\n\nFor strings, cables and other accessories, a specialized partner store is your best bet. If you'd like a trusted recommendation, our team can help at **${STORE.phoneIntl}**.\n\nIn the meantime, I can show you:`,
    outOfScopeChips: ["Acoustic guitars on sale", "Ukuleles to get started"],
    address: `We're at **${STORE.address}**, Campo Grande, Mato Grosso do Sul, Brazil (ZIP ${STORE.cep}). Phone and WhatsApp: **${STORE.phoneIntl}**.\n\nWe're open Monday to Friday, 9 am–6 pm, and Saturday, 9 am–1 pm. Drop by and try the instruments!`,
    hours:
      "Our opening hours:\n\n- **Monday to Friday:** 9 am to 6 pm\n- **Saturday:** 9 am to 1 pm\n- **Sundays and holidays:** closed\n\nOn special dates (Black Friday, the store's anniversary, Christmas) hours may be extended — we announce it on social media.",
    shipping:
      "It depends on where you are:\n\n- **Campo Grande metro area:** free delivery over R$500.00 (R$35.00 below that), delivered in 1 to 3 business days by our own courier.\n- **Other cities:** PAC (5 to 12 business days), SEDEX (2 to 5) or Jadlog (3 to 8), all with tracking and insurance. The price depends on ZIP code, weight and size.\n\nLarge instruments (acoustic drum kits, digital pianos) may need a special quote. Where would it ship to?",
    deals: (n: number) =>
      `Here are the **${n} deals running** right now. Keep in mind: sales last while stock lasts, and the Pix discount doesn't stack with sale prices.`,
    compare: (a: string, b: string, rows: string[]) =>
      `Let's compare the two steel-string folks:\n\n| | ${a} | ${b} |\n|---|---|---|\n${rows.join("\n")}\n\nThe Takamine's cedar usually sounds warmer and fuller; the Crafter's spruce is brighter, with plenty of projection.`,
    compareRows: { price: "Price", top: "Top", body: "Body", stock: "Stock" },
    notify: "Got it! As soon as it's back in stock, the team will let you know on the WhatsApp number on file.",
    noResults: "I couldn't find anything with those filters right now. Want me to widen the price range or look in another category?",
    searchResults: (n: number, promo?: { name: string; pct: number }, out?: string) =>
      `Nice! I picked **${n} ${n === 1 ? "option" : "options"}** in that range.${promo ? ` The **${promo.name}** is **${promo.pct}% off**.` : ""}${
        out ? ` The **${out}** is sold out, but I can let you know when it's back.` : ""
      } Want me to compare any of them?`,
    fallback:
      "Hmm, that one I can't answer here. I can help with **instruments, prices, stock, deals, orders** and **store policies** (returns, shipping, payment and opening hours). How about starting with one of these?",
    fallbackChips: ["Which acoustic guitars are under R$1,000?", "Ukuleles to get started", "I want to check my order"],
    topics: { returns: "right of withdrawal", defects: "defective items and warranty", payment: "payment methods and installments", store: "store details", hours: "opening hours", shipping: "shipping and delivery" },
  },
};

export type Copy = (typeof COPY)["pt"];
export type { Money };
