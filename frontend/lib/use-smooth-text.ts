"use client";

import { useEffect, useRef, useState } from "react";

/** Velocidade mínima (caracteres/s) e quanto tempo levamos para "alcançar" o texto acumulado. */
const MIN_CPS = 120;
const CATCH_UP_SECONDS = 0.8;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Efeito de digitação: revela `text` aos poucos, num ritmo constante, mesmo quando o modelo entrega a
 * resposta inteira de uma vez (o Claude às vezes manda tudo junto depois de consultar uma ferramenta).
 * A velocidade cresce com o que falta mostrar, então respostas longas não ficam para trás.
 *
 * `live` = o texto está chegando agora. Textos que já existiam (histórico) aparecem inteiros.
 */
export function useSmoothText(text: string, live: boolean): { shown: string; revealing: boolean } {
  const [count, setCount] = useState(() => (live && !prefersReducedMotion() ? 0 : text.length));
  const target = useRef(text.length);
  const textRef = useRef(text);
  const shownRef = useRef(count);
  const frame = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animated = useRef(live && !prefersReducedMotion());

  useEffect(() => {
    target.current = text.length;
    textRef.current = text;
    if (!animated.current) {
      shownRef.current = text.length;
      setCount(text.length);
      return;
    }
    if (frame.current !== null) return; // já está animando; o próximo quadro vê o novo alvo

    // Timer em vez de requestAnimationFrame: o rAF pausa em aba de fundo e o texto ficaria parado.
    let last = performance.now();
    let carry = 0;
    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 1);
      last = now;
      const backlog = target.current - shownRef.current;
      if (backlog <= 0) {
        frame.current = null;
        return;
      }
      carry += Math.max(MIN_CPS, backlog / CATCH_UP_SECONDS) * dt;
      const step = Math.floor(carry);
      if (step > 0) {
        carry -= step;
        let next = Math.min(target.current, shownRef.current + step);
        // não corta um emoji/caractere composto ao meio
        const code = textRef.current.charCodeAt(next - 1);
        if (code >= 0xd800 && code <= 0xdbff) next += 1;
        shownRef.current = next;
        setCount(next);
      }
      frame.current = setTimeout(tick, 16);
    };
    frame.current = setTimeout(tick, 16);
  }, [text]);

  useEffect(
    () => () => {
      if (frame.current !== null) clearTimeout(frame.current);
      frame.current = null; // no Strict Mode o efeito remonta: precisa poder recomeçar
    },
    [],
  );

  const shown = text.slice(0, count);
  return { shown, revealing: count < text.length };
}
