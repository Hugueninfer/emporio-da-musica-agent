import type { Metadata } from "next";
import Link from "next/link";
import { FONT_CLASSES } from "@/components/RootShell";
import { en } from "@/lib/i18n/en";
import { pt } from "@/lib/i18n/pt";
import "./globals.css";

export const metadata: Metadata = { title: `404 · ${en.notFound.title}` };

/** 404 global (há dois layouts raiz, um por idioma): bilíngue, sem depender de layout. */
export default function GlobalNotFound() {
  return (
    <html lang="en" className={FONT_CLASSES}>
      <body className="flex min-h-dvh items-center justify-center bg-em-bg px-5 text-em-text">
        <main className="flex max-w-[520px] flex-col gap-5">
          <span className="label-mono text-em-muted">404</span>
          <h1 className="m-0 font-display text-[clamp(40px,7vw,64px)] font-extrabold leading-[0.95] tracking-[-0.03em]">
            {en.notFound.title}
          </h1>
          <p className="m-0 text-em-text-2">
            {en.notFound.body}
            <br />
            <span lang="pt-BR" className="text-em-muted">
              {pt.notFound.body}
            </span>
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="inline-flex h-[46px] items-center rounded-[10px] bg-[#F4E9DC] px-5 text-sm font-semibold text-[#1F0F08] no-underline">
              {en.notFound.back}
            </Link>
            <Link href="/pt" lang="pt-BR" className="inline-flex h-[46px] items-center rounded-[10px] border border-em-line-strong px-5 text-sm font-semibold text-em-text no-underline">
              {pt.notFound.back}
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
