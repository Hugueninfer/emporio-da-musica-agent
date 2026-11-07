// Agente MOCK: roteia por palavras-chave e emite o mesmo protocolo de stream (UI message
// stream do AI SDK) que o backend Python vai emitir. Serve para desenvolver e demonstrar a
// UI sem LLM. Nada aqui é a lógica real do agente.
// Responde no idioma em que o cliente escreveu; se não der para saber, no idioma da página.
import "server-only";
import type { UIMessageStreamWriter } from "ai";
import { hasSellingPrice, isBuyable, priceInfo, type Product } from "../catalog";
import type { EmUIMessage, VerificationPayload } from "../chat-types";
import { normalize } from "../format";
import type { Locale } from "../i18n/config";
import { en } from "../i18n/en";
import { money } from "../i18n/format";
import { specValue } from "../i18n/text";
import { CATALOG } from "./catalog";
import { COPY, type Copy } from "./copy";
import { ORDERS } from "./orders";
import { installmentOptions, pixPrice } from "./rules";

type Writer = UIMessageStreamWriter<EmUIMessage>;

interface Ctx {
  writer: Writer;
  signal: AbortSignal;
  lang: Locale;
  c: Copy;
  brl: (value: number) => string;
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(t), reject(signal.reason)), { once: true });
  });

let seq = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(seq++).toString(36)}`;

/** Escreve texto em pedacinhos, simulando tokens. */
async function say({ writer, signal }: Ctx, text: string) {
  const id = nextId("txt");
  writer.write({ type: "text-start", id });
  for (const chunk of text.match(/\S+\s*|\s+/g) ?? []) {
    await sleep(14 + Math.random() * 26, signal);
    writer.write({ type: "text-delta", id, delta: chunk });
  }
  writer.write({ type: "text-end", id });
}

async function tool({ writer, signal }: Ctx, toolName: string, input: unknown, run: () => unknown, delay = 650) {
  const toolCallId = nextId("call");
  writer.write({ type: "tool-input-start", toolCallId, toolName });
  writer.write({ type: "tool-input-available", toolCallId, toolName, input });
  await sleep(delay, signal);
  writer.write({ type: "tool-output-available", toolCallId, output: run() });
}

const suggestions = (writer: Writer, items: string[]) => writer.write({ type: "data-suggestions", data: { items } });

// ---------------------------------------------------------------------------------------------
// Idioma da mensagem

const EN_WORDS = /\b(the|what|which|how|much|is|are|do|does|you|your|my|can|where|when|order|price|guitars?|store|return|refund|hours|open|shipping|delivery|under|sale|deals?|tell|me|about|with|similar|installments?|compare|want|check|cost|have|sell|need|show|please|thanks|hi|hello)\b/g;
const PT_WORDS = /\b(que|qual|quais|quanto|voce|voces|meu|minha|pedido|preco|violao|violoes|loja|devolver|horario|frete|ate|promocao|posso|quero|tem|como|sobre|conta|parcelamento|oi|ola|obrigad[oa]|vende|vendem|onde|fica|nao|sim|pra|para|com|uma?)\b/g;

function detectLang(text: string, fallback: Locale): Locale {
  const en = text.match(EN_WORDS)?.length ?? 0;
  const pt = text.match(PT_WORDS)?.length ?? 0;
  if (en > pt) return "en";
  if (pt > en) return "pt";
  return fallback;
}

// ---------------------------------------------------------------------------------------------
// Consultas ao "sistema"

const CATEGORY_WORDS: [RegExp, string][] = [
  [/guitarra|electric guitar|eletric/, "Guitarras"],
  [/violo(es)?|violao|acoustic|\bguitars?\b/, "Violões"],
  [/ukulele|\buke/, "Ukuleles"],
  [/baixo|\bbass/, "Baixos"],
  [/bateria|\bdrums?\b/, "Baterias e Percussão"],
  [/teclado|piano|sintetizador|keyboard|synth/, "Teclados e Pianos"],
];

function parseMaxPrice(t: string): number | undefined {
  const m = t.match(
    /(?:ate|max(?:imo)?|menos de|abaixo de|no maximo|under|below|up to|less than|within)\s*(?:uns\s*)?(?:r\$|\$)?\s*([\d.,]+)\s*(mil|k)?/,
  );
  if (!m) return undefined;
  // "1.000" / "1,000" = milhar; "2,5" / "2.5" = decimal
  const raw = m[1].replace(/[.,]$/, "");
  let n = /^\d{1,3}([.,]\d{3})+$/.test(raw) ? Number(raw.replace(/[.,]/g, "")) : Number(raw.replace(",", "."));
  if (m[2]) n *= 1000;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function findProductsByName(t: string): Product[] {
  const tokens = t.split(/[^a-z0-9-]+/).filter((w) => w.length >= 3);
  const scored = CATALOG.map((p) => {
    const words = normalize(p.name).split(/[^a-z0-9-]+/);
    // Modelo (ex.: gd20, ht-100) vale mais que marca.
    const score = tokens.reduce((s, tok) => s + (words.includes(tok) ? (/\d/.test(tok) ? 3 : 1) : 0), 0);
    return { p, score };
  }).filter((x) => x.score >= 2 || (x.score >= 1 && /\d/.test(t)));
  const best = Math.max(0, ...scored.map((x) => x.score));
  return scored.filter((x) => x.score === best).map((x) => x.p);
}

function searchProducts(t: string) {
  const category = CATEGORY_WORDS.find(([re]) => re.test(t))?.[1];
  const max = parseMaxPrice(t);
  const strings = /\baco\b|steel/.test(t) ? "Aço" : /nylon|classical/.test(t) ? "Nylon" : undefined;
  const folk = /folk/.test(t);
  const produtos = CATALOG.filter(
    (p) =>
      p.status === "active" &&
      (!category || p.category === category) &&
      (!max || priceInfo(p).current <= max) &&
      (!strings || p.specs.some((s) => s.label === "Cordas" && s.value === strings)) &&
      (!folk || /folk|dreadnought/i.test(p.categoryLabel)),
  )
    .sort((a, b) => Number(isBuyable(b)) - Number(isBuyable(a)) || priceInfo(a).current - priceInfo(b).current)
    .slice(0, 6);
  const input = { categoria: category, preco_max: max, cordas: strings, formato: folk ? "folk" : undefined };
  return { input: JSON.parse(JSON.stringify(input)) as Record<string, unknown>, produtos };
}

/** Seções do manual citadas (id + texto original em PT; a UI traduz pelo id). */
const SOURCES = {
  returns: { id: "4.1", documento: "Política de Trocas e Devoluções", secao: "4.1 Direito de Arrependimento" },
  defects: { id: "4.2", documento: "Política de Trocas e Devoluções", secao: "4.2 Trocas por Defeito" },
  payment: { id: "3.1", documento: "Formas de Pagamento", secao: "3.1 Regras de Parcelamento" },
  hours: { id: "2", documento: "Horário de Funcionamento", secao: "2. Horário de Funcionamento" },
  store: { id: "1.2", documento: "Sobre a Empório da Música", secao: "1.2 Dados da Empresa" },
  shipping: { id: "5", documento: "Política de Frete e Entregas", secao: "5.1 e 5.2 Entregas" },
};

function policy(ctx: Ctx, key: keyof typeof SOURCES) {
  return tool(ctx, "consultar_politicas", { tema: ctx.c.topics[key] }, () => ({ fontes: [SOURCES[key]] }), 550);
}

// ---------------------------------------------------------------------------------------------
// Fluxos

async function orderLookup(ctx: Ctx, v: VerificationPayload) {
  const digits = v.contato.replace(/\D/g, "");
  const email = v.contato.trim().toLowerCase();
  let order: (typeof ORDERS)[number] | undefined;
  await tool(ctx, "consultar_pedido", { pedido: Number(v.pedido), contato: "•••" }, () => {
    order = ORDERS.find(
      (o) =>
        String(o.numero) === v.pedido &&
        ((digits.length >= 8 && o._contato.telefone.endsWith(digits.slice(-8))) || o._contato.email === email),
    );
    if (!order) return { verificado: false, motivo: "dados_nao_conferem" };
    // O contato nunca sai do servidor: só o pedido vai para a UI.
    const pedido: Omit<typeof order, "_contato"> & { _contato?: unknown } = { ...order };
    delete pedido._contato;
    return { verificado: true, pedido };
  });

  if (!order) {
    await say(ctx, ctx.c.orderNotFound);
    return;
  }
  await say(ctx, ctx.c.orderStatus(order._contato.nome)[order.status]);
  await say(ctx, ctx.c.orderOutro);
}

async function productAnswer(ctx: Ctx, t: string, matches: Product[]) {
  const { c, brl } = ctx;
  await tool(ctx, "buscar_produtos", { busca: t.slice(0, 60) }, () => ({ produtos: matches.slice(0, 4) }));
  const p = matches[0];
  if (matches.length > 1) return say(ctx, c.manyMatches(matches.length));
  if (!hasSellingPrice(p)) return say(ctx, p.status === "discontinued" ? c.discontinued(p.name) : c.comingSoon(p.name));
  const info = priceInfo(p);
  if (!isBuyable(p)) return say(ctx, c.soldOut(p.name, brl(info.current)));
  const top = p.specs.find((s) => s.label === "Tampo")?.value;
  await say(
    ctx,
    c.productPrice({
      name: p.name,
      price: brl(info.current),
      old: info.original ? brl(info.original) : undefined,
      pct: info.percent,
      campaign: info.promoLabel,
      stock: p.stock,
      top: top && (ctx.lang === "en" ? specValue(en, top) : top),
      has3d: Boolean(p.finish),
    }),
  );
}

async function installments(ctx: Ctx, t: string) {
  const { c, brl } = ctx;
  await policy(ctx, "payment");
  const p = findProductsByName(t)[0] ?? (/takamine|gd20/.test(t) ? CATALOG.find((x) => x.id === 95) : undefined);
  if (!p || !hasSellingPrice(p)) return say(ctx, c.paymentGeneral);
  const info = priceInfo(p);
  const pix = pixPrice(p.price, Boolean(info.original));
  const opts = installmentOptions(info.current);
  const pick = [opts.find((o) => o.n === 3), opts.find((o) => o.n === 6), opts.at(-1)].filter(
    (o, i, arr): o is { n: number; value: number } => Boolean(o) && arr.findIndex((x) => x?.n === o?.n) === i,
  );
  const rows = [
    `| ${c.rowPix} | 1x | ${brl(pix ?? info.current)} | ${brl(pix ?? info.current)} |`,
    `| ${c.rowDebit} | 1x | ${brl(info.current)} | ${brl(info.current)} |`,
    ...pick.map((o) => `| ${c.rowCredit} | ${o.n}x | ${brl(o.value)} | ${brl(info.current)} |`),
  ];
  await say(ctx, c.installmentTable(p.name, brl(info.current), rows, pix ? c.pixSaves(brl(info.current - pix)) : c.pixNoStack));
}

// ---------------------------------------------------------------------------------------------

export async function runMockAgent(
  writer: Writer,
  messages: EmUIMessage[],
  verification: VerificationPayload | undefined,
  pageLocale: Locale,
  signal: AbortSignal,
) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const raw = lastUser?.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ") ?? "";
  const t = normalize(raw);
  const lang = verification ? pageLocale : detectLang(t, pageLocale);
  const ctx: Ctx = { writer, signal, lang, c: COPY[lang], brl: (v) => money(v, lang) };
  const { c } = ctx;

  writer.write({ type: "start" });
  writer.write({ type: "start-step" });

  if (verification) {
    await orderLookup(ctx, verification);
  } else if (/simular erro|simulate error|#erro|#error/.test(t)) {
    await say(ctx, c.checking);
    await sleep(500, signal);
    throw new Error("Falha simulada de conexão");
  } else if (
    /pedido|rastrei|rastreio|cade meu|\border\b|tracking|track my|my package|where is my/.test(t) &&
    !/devolv|arrepend|return|refund/.test(t)
  ) {
    await say(ctx, c.verifyIntro);
    await tool(ctx, "solicitar_verificacao", {}, () => ({ campos: ["pedido", "contato"] }), 200);
  } else if (/arrepend|devolv|desist|reembols|\breturn|refund|change my mind/.test(t)) {
    await policy(ctx, "returns");
    await say(ctx, c.returns);
  } else if (/defeito|quebr|garantia|estragou|defect|broken|warranty|faulty/.test(t)) {
    await policy(ctx, "defects");
    await say(ctx, c.defects);
  } else if (/parcel|cartao|credito|\bpix\b|boleto|pagamento|pagar|vezes|installment|credit card|payment|\bpay\b/.test(t)) {
    await installments(ctx, t);
  } else if (
    /encord|(vende|vendem|tem) cordas|jogo de cordas|cordas? (avulsa|reserva)|cabo|palheta|pedal|amplificador|\bamps?\b|amplifier|\bcases?\b|\bcapa\b|acessori|afinador|accessor|tuner|\bcables?\b|\bpicks?\b|\bstrings\b(?!.*(guitar|ukulele|acoustic))|string set/.test(
      t,
    )
  ) {
    await say(ctx, c.outOfScope);
    suggestions(writer, c.outOfScopeChips);
  } else if (/endereco|onde fica|localiza|como chego|telefone|contato|whatsapp|address|where is the store|where are you|located|location|phone|contact/.test(t)) {
    await policy(ctx, "store");
    await say(ctx, c.address);
  } else if (/horario|abre|fecha|funciona|domingo|feriado|sabado|hours|opening|\bopen\b|close|sunday|saturday|holiday/.test(t)) {
    await policy(ctx, "hours");
    await say(ctx, c.hours);
  } else if (/frete|entrega|envio|prazo|correios|sedex|shipping|deliver|\bship\b/.test(t)) {
    await policy(ctx, "shipping");
    await say(ctx, c.shipping);
  } else if (/promo|desconto|oferta|liquida|black friday|\bdeals?\b|discount|\bsale\b|offer/.test(t)) {
    const produtos = CATALOG.filter((p) => p.promo && p.status === "active");
    await tool(ctx, "buscar_promocoes", { ativas: true }, () => ({ produtos }));
    await say(ctx, c.deals(produtos.length));
  } else if (/compar/.test(t)) {
    const a = CATALOG.find((p) => p.id === 95)!;
    const b = CATALOG.find((p) => p.id === 90)!;
    await tool(ctx, "buscar_produtos", { ids: [95, 90] }, () => ({ produtos: [a, b] }));
    const spec = (p: Product, l: string) => p.specs.find((s) => s.label === l)?.value ?? "—";
    const short = (p: Product) => p.name.split(" ").slice(0, 2).join(" ");
    const r = c.compareRows;
    await say(
      ctx,
      c.compare(short(a), short(b), [
        `| ${r.price} | ${ctx.brl(priceInfo(a).current)} | ${ctx.brl(priceInfo(b).current)} (−${b.promo?.percent}%) |`,
        `| ${r.top} | ${spec(a, "Tampo")} | ${spec(b, "Tampo")} |`,
        `| ${r.body} | ${spec(a, "Formato")} | ${spec(b, "Formato")} |`,
        `| ${r.stock} | ${a.stock} | ${b.stock} |`,
      ]),
    );
  } else if (/avis|notify|let me know/.test(t)) {
    await say(ctx, c.notify);
  } else {
    const byName = findProductsByName(t);
    const isSearch = CATEGORY_WORDS.some(([re]) => re.test(t)) || parseMaxPrice(t) !== undefined;
    if (byName.length > 0 && byName.length <= 4) {
      await productAnswer(ctx, t, byName);
    } else if (isSearch) {
      const { input, produtos } = searchProducts(t);
      await tool(ctx, "buscar_produtos", input, () => ({ produtos }));
      if (produtos.length === 0) {
        await say(ctx, c.noResults);
      } else {
        const promo = produtos.find((p) => p.promo && isBuyable(p));
        const out = produtos.find((p) => !isBuyable(p));
        await say(ctx, c.searchResults(produtos.length, promo && { name: promo.name, pct: promo.promo!.percent }, out?.name));
      }
    } else {
      await say(ctx, c.fallback);
      suggestions(writer, c.fallbackChips);
    }
  }

  writer.write({ type: "finish-step" });
  writer.write({ type: "finish" });
}
