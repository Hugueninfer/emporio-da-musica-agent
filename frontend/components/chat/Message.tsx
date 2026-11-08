"use client";

import { useCallback, useState, type ReactNode } from "react";
import { AssistantAvatar } from "@/components/brand/Logo";
import type { Product } from "@/lib/catalog";
import type { EmUIMessage, PolicySource } from "@/lib/chat-types";
import type { Order } from "@/lib/orders";
import { useI18n } from "@/components/i18n/I18nProvider";
import { toolMeta } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { useEmChat } from "./ChatProvider";
import { useChatSurface } from "./ChatSurface";
import { IdentityForm } from "./parts/IdentityForm";
import { OrderStatusCard } from "./parts/OrderStatusCard";
import { ProductList } from "./parts/ProductCard";
import { SourceChip } from "./parts/SourceChip";
import { SuggestionChips } from "./parts/SuggestionChips";
import { TextPart } from "./parts/TextPart";
import { ThinkingIndicator } from "./parts/ThinkingIndicator";
import { ToolIndicator } from "./parts/ToolIndicator";

type Part = EmUIMessage["parts"][number];

interface ToolPartLike {
  toolCallId: string;
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

/** Normaliza partes estáticas (tool-<nome>) e dinâmicas (dynamic-tool) num formato só. */
function asTool(part: Part): (ToolPartLike & { name: string }) | null {
  if (part.type === "dynamic-tool") return { ...(part as unknown as ToolPartLike), name: part.toolName };
  if (part.type.startsWith("tool-")) return { ...(part as unknown as ToolPartLike), name: part.type.slice(5) };
  return null;
}

/** UI generativa a partir da saída de cada ferramenta. */
function ToolResult({ name, output, isLast }: { name: string; output: unknown; isLast: boolean }) {
  const { focus } = useEmChat();
  const o = (output ?? {}) as Record<string, unknown>;
  switch (name) {
    case "buscar_produtos":
    case "buscar_promocoes":
      return <ProductList products={(o.produtos as Product[]) ?? []} activeId={focus.id} />;
    case "consultar_pedido":
      return o.verificado && o.pedido ? <OrderStatusCard order={o.pedido as Order} /> : null;
    case "solicitar_verificacao":
      return <IdentityForm locked={!isLast} />;
    default:
      return null;
  }
}

export function Message({ message, streaming, isLast }: { message: EmUIMessage; streaming: boolean; isLast: boolean }) {
  const { variant } = useChatSurface();
  const { t } = useI18n();
  const [revealing, setRevealing] = useState<Record<number, boolean>>({});
  const onRevealing = useCallback(
    (i: number, r: boolean) => setRevealing((prev) => (prev[i] === r ? prev : { ...prev, [i]: r })),
    [],
  );

  if (message.role === "user") {
    const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    return (
      <div
        className={cn(
          "max-w-[84%] self-end whitespace-pre-wrap break-words bg-em-bubble-user text-em-on-bubble-user",
          variant === "full" ? "rounded-[18px_18px_4px_18px] px-4 py-3 sm:max-w-[76%]" : "rounded-[16px_16px_4px_16px] px-3.5 py-2.5",
        )}
      >
        <span className="sr-only">{t.chat.you}</span>
        {text}
      </div>
    );
  }

  const sources: PolicySource[] = [];
  // Partes de texto ainda "digitando": sugestões e fontes só aparecem quando tudo terminou.
  const settled = !streaming && !Object.values(revealing).some(Boolean);
  const lastTextIndex = message.parts.findLastIndex((p) => p.type === "text");
  const blocks: ReactNode[] = [];

  message.parts.forEach((part, i) => {
    if (part.type === "text") {
      if (!part.text) return;
      const text = (
        <TextPart
          text={part.text}
          streaming={streaming && i === lastTextIndex}
          live={streaming}
          onRevealingChange={(r) => onRevealing(i, r)}
        />
      );
      blocks.push(
        variant === "widget" ? (
          <div key={i} className="max-w-[92%] self-start rounded-[16px_16px_16px_4px] bg-em-bubble-bot px-3.5 py-[11px]">
            {text}
          </div>
        ) : (
          <div key={i}>{text}</div>
        ),
      );
      return;
    }

    if (part.type === "data-suggestions") {
      if (isLast && settled) blocks.push(<SuggestionChips key={i} items={part.data.items} />);
      return;
    }

    const tool = asTool(part);
    if (!tool) return;
    if (tool.name === "consultar_politicas" && tool.state === "output-available") {
      const fontes = (tool.output as { fontes?: PolicySource[] })?.fontes ?? [];
      sources.push(...fontes);
    }
    blocks.push(
      <div key={i} className="flex flex-col gap-3">
        {!toolMeta(t, tool.name).hidden && (
          <ToolIndicator name={tool.name} state={tool.state} input={tool.input} output={tool.output} errorText={tool.errorText} />
        )}
        {tool.state === "output-available" && <ToolResult name={tool.name} output={tool.output} isLast={isLast} />}
      </div>,
    );
  });

  // Enquanto a Clave trabalha sem nada novo na tela: antes de qualquer conteúdo ("pensando…") ou depois
  // de uma ferramenta terminar, até o texto começar ("escrevendo a resposta…").
  if (streaming) {
    const lastPart = message.parts.filter((p) => (p.type === "text" ? p.text : asTool(p))).at(-1);
    const lastTool = lastPart && lastPart.type !== "text" ? asTool(lastPart) : null;
    if (!lastPart) {
      blocks.push(<ThinkingIndicator key="thinking" label={t.chat.thinking} />);
    } else if (lastTool?.state === "output-available") {
      blocks.push(<ThinkingIndicator key="thinking" label={t.chat.writing} />);
    }
  }

  const uniqueSources = sources.filter((s, i) => sources.findIndex((x) => x.secao === s.secao) === i);
  const content = (
    <>
      {blocks}
      {settled && uniqueSources.map((s) => <SourceChip key={s.secao} source={s} />)}
    </>
  );

  if (variant === "widget") {
    return <div className="flex flex-col gap-2.5">{content}</div>;
  }

  return (
    <article className="flex items-start gap-3.5">
      <AssistantAvatar />
      <div className="flex min-w-0 grow flex-col gap-3.5">
        <span className="text-[13px] font-semibold text-em-muted">{t.chat.assistant}</span>
        {content}
      </div>
    </article>
  );
}

/** Placeholder enquanto a resposta não começou a chegar. */
export function PendingMessage() {
  const { variant } = useChatSurface();
  const { t } = useI18n();
  if (variant === "widget") {
    return (
      <div className="self-start rounded-[16px_16px_16px_4px] bg-em-bubble-bot px-3.5 py-2" aria-label={t.chat.pending}>
        <ThinkingIndicator label={t.chat.thinking} />
      </div>
    );
  }
  return (
    <article className="flex items-start gap-3.5" aria-label={t.chat.pending}>
      <AssistantAvatar />
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-em-muted">{t.chat.assistant}</span>
        <ThinkingIndicator label={t.chat.thinking} />
      </div>
    </article>
  );
}
