"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { useEmChat } from "./ChatProvider";
import { Message, PendingMessage } from "./Message";
import { ErrorCard } from "./parts/ErrorCard";

/**
 * Lista de mensagens da conversa ativa. `scrollRef` é o container que rola:
 * acompanhamos o fim enquanto o cliente estiver perto dele.
 */
export function MessageList({ scrollRef, className }: { scrollRef: RefObject<HTMLElement | null>; className?: string }) {
  const { chat } = useEmChat();
  const { messages, status, regenerate } = useChat({ chat });
  const endRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  // Só para de acompanhar quando o cliente rola para cima de verdade (roda do mouse, toque, teclado,
  // barra de rolagem). Rolagens que o próprio navegador faz ao inserir conteúdo (ex.: o card do pedido
  // entrando com o botão do formulário em foco) não contam — antes elas desligavam o acompanhamento.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let lastInput = -Infinity;
    const onInput = () => {
      lastInput = performance.now();
    };
    const onScroll = () => {
      const nearEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
      if (nearEnd) stick.current = true;
      else if (performance.now() - lastInput < 1000) stick.current = false;
    };
    const inputs = ["wheel", "touchmove", "keydown", "pointerdown"] as const;
    inputs.forEach((type) => el.addEventListener(type, onInput, { passive: true }));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      inputs.forEach((type) => el.removeEventListener(type, onInput));
      el.removeEventListener("scroll", onScroll);
    };
  }, [scrollRef]);

  // Nova conversa ou mensagem enviada: volta a acompanhar o fim.
  const lastRole = messages.at(-1)?.role;
  useEffect(() => {
    if (lastRole === "user") stick.current = true;
  }, [lastRole, messages.length]);

  useEffect(() => {
    if (stick.current) endRef.current?.scrollIntoView({ block: "end" });
  });

  // O texto cresce aos poucos (efeito de digitação) sem mudar a lista: acompanha pelo tamanho.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (stick.current) endRef.current?.scrollIntoView({ block: "end" });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const last = messages.at(-1);
  const busy = status === "submitted" || status === "streaming";

  return (
    <div ref={listRef} role="log" aria-live="polite" aria-relevant="additions" className={cn("flex flex-col", className)}>
      {messages.map((m, i) => (
        <Message
          key={m.id}
          message={m}
          isLast={i === messages.length - 1}
          // "submitted" também conta: a mensagem da Clave já existe antes do primeiro conteúdo chegar
          streaming={busy && i === messages.length - 1 && m.role === "assistant"}
        />
      ))}
      {busy && last?.role === "user" && <PendingMessage />}
      {status === "error" && <ErrorCard onRetry={() => void regenerate()} />}
      <div ref={endRef} />
    </div>
  );
}
