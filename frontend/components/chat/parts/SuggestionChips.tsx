"use client";

import { cn } from "@/lib/utils";
import { useEmChat } from "../ChatProvider";

export function SuggestionChips({
  items,
  className,
  scroll = false,
  disabled = false,
}: {
  items: string[];
  className?: string;
  /** Uma linha com rolagem horizontal (acima do composer) em vez de quebrar. */
  scroll?: boolean;
  disabled?: boolean;
}) {
  const { sendText } = useEmChat();
  return (
    <div className={cn("flex gap-2", scroll ? "no-scrollbar overflow-x-auto" : "flex-wrap", className)}>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          disabled={disabled}
          onClick={() => sendText(item)}
          className="min-h-9 shrink-0 rounded-full border border-em-line-strong bg-transparent px-3.5 text-[13px] font-medium text-em-text hover:border-em-accent disabled:opacity-50"
        >
          {item}
        </button>
      ))}
    </div>
  );
}
