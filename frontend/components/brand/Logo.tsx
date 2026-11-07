import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Símbolo da Empório: palheta com a boca de violão e um anel de roseta.
 * Geometria em viewBox 0 0 100 100 (também em public/brand/emporio-simbolo.svg).
 */
export const PICK = {
  path: "M50 3.9C72 3.9 90.6 13.5 90.6 30.5C90.6 47 72 76 55.5 93C53.4 96.6 46.6 96.6 44.5 93C28 76 9.4 47 9.4 30.5C9.4 13.5 28 3.9 50 3.9Z",
  cx: 50,
  cy: 35.36,
  hole: 15.33,
  ring: 20.44,
  ringWidth: 1.51,
} as const;

/** Abaixo disso o anel vira um fio de menos de 0,6 px e só suja o desenho. */
const RING_MIN_SIZE = 40;

/**
 * Palheta laranja com a boca escura. `hole` = cor do furo e do anel (normalmente a cor do fundo).
 * O anel de roseta aparece só em tamanhos grandes (versão simplificada para favicon/header).
 */
export function PickIcon({
  size = 30,
  hole = "var(--em-bg)",
  ring,
  className,
}: {
  size?: number;
  hole?: string;
  ring?: boolean;
  className?: string;
}) {
  const showRing = ring ?? size >= RING_MIN_SIZE;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <path d={PICK.path} fill="var(--em-accent)" />
      <circle cx={PICK.cx} cy={PICK.cy} r={showRing ? PICK.hole : PICK.hole + 1.5} fill={hole} />
      {showRing && <circle cx={PICK.cx} cy={PICK.cy} r={PICK.ring} fill="none" stroke={hole} strokeWidth={PICK.ringWidth} />}
    </svg>
  );
}

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <PickIcon />
      <span className="font-display text-[19px] font-extrabold tracking-[0.01em]">EMPÓRIO</span>
      {!compact && <span className="font-mono text-[11px] tracking-[0.12em] text-em-muted">DA MÚSICA</span>}
    </span>
  );
}

/**
 * Avatar da Clave (a assistente): retrato ilustrado em círculo, com o ponto verde de "online"
 * opcional. A arte já é circular sobre fundo escuro; o zoom leve esconde a borda da ilustração.
 */
export function AssistantAvatar({
  size = 36,
  online = false,
  dotRing = "ring-em-surface-2",
  className,
}: {
  size?: number;
  online?: boolean;
  /** Cor do anel em volta do ponto "online" (a mesma do fundo onde o avatar está). */
  dotRing?: string;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <span className="size-full overflow-hidden rounded-full bg-em-bg shadow-[0_0_0_1.5px_var(--em-line-strong)]">
        <Image src="/brand/clave.webp" alt="" width={size} height={size} sizes={`${size}px`} className="size-full scale-[1.08] object-cover" />
      </span>
      {online && (
        <span className={cn("em-live absolute bottom-0 right-0 size-[28%] min-h-2 min-w-2 rounded-full bg-em-ok ring-2", dotRing)} />
      )}
    </span>
  );
}
