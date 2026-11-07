import { localeMetadata, RootShell } from "@/components/RootShell";
import "../globals.css";

export { viewport } from "@/components/RootShell";
export const metadata = localeMetadata("en");

/** Layout raiz do site em inglês (idioma padrão, rotas sem prefixo). */
export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <RootShell locale="en">{children}</RootShell>;
}
