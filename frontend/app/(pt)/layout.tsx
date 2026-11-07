import { localeMetadata, RootShell } from "@/components/RootShell";
import "../globals.css";

export { viewport } from "@/components/RootShell";
export const metadata = localeMetadata("pt");

/** Layout raiz do site em português (rotas em /pt). */
export default function PortugueseLayout({ children }: { children: React.ReactNode }) {
  return <RootShell locale="pt">{children}</RootShell>;
}
