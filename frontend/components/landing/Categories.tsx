"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { CATALOG } from "@/lib/mock/catalog";
import { STORE } from "@/lib/store";

const countActive = (category: string) => CATALOG.filter((p) => p.category === category && p.status === "active").length;

/** Categoria do catálogo (data/categories.csv) de cada item do dicionário, na mesma ordem. */
const CATEGORY_KEYS = ["Violões", "Ukuleles", "Guitarras", "Baixos", "Baterias e Percussão", "Teclados e Pianos"];

/** 01 / O que a gente vende (seção creme). */
export function Categories() {
  const { t, locale } = useI18n();
  const c = t.categories;
  return (
    <section id="instrumentos" className="scroll-mt-24 bg-em-cream py-28 text-em-ink max-[640px]:py-16">
      <div className="em-wrap grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-16 gap-y-12 max-[900px]:grid-cols-1">
        <div className="flex flex-col">
          <span className="font-mono text-[10.5px] tracking-[0.14em] text-em-ink-muted">{c.label}</span>
          <h2 className="mb-0 mt-5 whitespace-pre-line font-display text-[clamp(40px,4.4vw,62px)] font-extrabold leading-[0.95] tracking-[-0.035em]">
            {c.title}
          </h2>
          <p className="mb-0 mt-6 max-w-[380px] text-sm leading-relaxed text-em-ink-2">{c.body}</p>
          <p className="mb-0 mt-8 max-w-[380px] border-l-2 border-em-accent-on-cream pl-4 text-[13px] leading-relaxed text-em-ink-2">
            <strong className="font-semibold text-em-ink">{c.accessoriesTitle}</strong> {c.accessoriesBody}{" "}
            <a href={STORE.phoneHref} className="font-semibold text-em-accent-on-cream">
              {locale === "en" ? STORE.phoneIntl : STORE.phone}
            </a>
            .
          </p>
        </div>

        <ul className="m-0 grid list-none grid-cols-2 gap-x-8 gap-y-9 self-center p-0 max-[480px]:grid-cols-1">
          {c.items.map((item, i) => (
            <li key={item.name} className="flex flex-col gap-2 border-t border-em-cream-line pt-4">
              <span className="font-mono text-[10px] tracking-[0.14em] text-em-ink-muted">{c.models(countActive(CATEGORY_KEYS[i]))}</span>
              <strong className="text-[15px] font-semibold">{item.name}</strong>
              <span className="text-[13px] leading-relaxed text-em-ink-2">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
