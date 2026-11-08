/** Clave pensando: três pontos pulando e o rótulo com brilho (ex.: "pensando…", "escrevendo a resposta…"). */
export function ThinkingIndicator({ label }: { label: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2.5 py-1">
      <span className="em-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="em-shimmer text-[13.5px] font-medium">{label}</span>
    </span>
  );
}
