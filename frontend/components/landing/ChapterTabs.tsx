import { cn } from "@/lib/utils";
import type { Chapter } from "./chapters";

/** Abas 01–05: a ativa ganha a barra laranja enchendo conforme a rolagem. */
export function ChapterTabs({
  chapters,
  active,
  fill,
  onPick,
  label,
}: {
  chapters: Chapter[];
  active: number;
  /** 0–1: quanto do capítulo ativo já foi rolado. */
  fill: number;
  onPick: (i: number) => void;
  /** Rótulo do grupo de abas (leitores de tela). */
  label: string;
}) {
  return (
    <div className="no-scrollbar overflow-x-auto">
      <div role="group" aria-label={label} className="grid min-w-[620px] grid-cols-5 gap-4">
        {chapters.map((c, i) => (
          <button
            key={c.n}
            type="button"
            onClick={() => onPick(i)}
            aria-pressed={i === active}
            className={cn(
              "flex min-h-11 flex-col justify-end gap-3 text-left text-xs font-medium transition-colors",
              i === active ? "text-em-text" : "text-em-faint hover:text-em-text-2",
            )}
          >
            <span className="flex items-baseline gap-3">
              <span className={cn("font-mono text-[10.5px]", i === active ? "text-em-accent-text" : "text-em-faint")}>{c.n}</span>
              {c.tab}
            </span>
            <span aria-hidden="true" className="relative block h-0.5 w-full overflow-hidden rounded-sm bg-[rgba(244,233,220,0.14)]">
              {i === active && (
                <span className="absolute inset-y-0 left-0 bg-em-accent" style={{ width: `${Math.max(6, fill * 100)}%` }} />
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
