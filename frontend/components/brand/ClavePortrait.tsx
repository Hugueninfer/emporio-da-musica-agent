"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useMediaQuery } from "@/lib/use-scroll";
import { cn } from "@/lib/utils";

// WebGL só no cliente; enquanto carrega (e sem WebGL) fica o retrato estático.
const ClavePortraitCanvas = dynamic(() => import("./ClavePortraitCanvas").then((m) => m.ClavePortraitCanvas), { ssr: false });

/** Retrato da Clave com profundidade: segue o mouse, pisca, respira e balança a palheta. */
export function ClavePortrait({ size = 240, className }: { size?: number; className?: string }) {
  const { t } = useI18n();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)", true);
  const still = (
    <Image src="/brand/clave.webp" alt="" width={size} height={size} sizes={`${size}px`} className="size-full object-cover" priority={false} />
  );
  return (
    <div
      role="img"
      aria-label={t.chat.portraitAlt}
      className={cn("relative shrink-0 overflow-hidden rounded-full bg-em-bg", className)}
      style={{ width: size, height: size }}
    >
      {still}
      {!reducedMotion && <ClavePortraitCanvas fallback={null} reducedMotion={reducedMotion} />}
    </div>
  );
}
