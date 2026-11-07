import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const components: Components = {
  p: ({ children }) => <p className="m-0">{children}</p>,
  ul: ({ children }) => <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} className="font-semibold text-em-accent-text underline-offset-2 hover:underline">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-xl border border-em-line">
      <table className="tabular w-full min-w-[420px] border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-em-surface-2 text-left">{children}</thead>,
  th: ({ children, style }) => (
    <th scope="col" className="px-3.5 py-2.5 font-semibold text-em-text-2" style={style}>
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td className="border-t border-em-line px-3.5 py-2.5" style={style}>
      {children}
    </td>
  ),
  code: ({ children }) => <code className="rounded bg-em-surface-2 px-1 font-mono text-[0.9em]">{children}</code>,
};

/** Texto do assistente em markdown. `streaming` desenha o cursor laranja no fim do último bloco. */
export function TextPart({ text, streaming }: { text: string; streaming?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-2.5 break-words", streaming && "em-streaming")}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
