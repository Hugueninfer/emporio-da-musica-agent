"use client";

import { useEffect, useRef, useState } from "react";
import { useEmChat } from "@/components/chat/ChatProvider";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { CONFIG_FINISHES } from "@/lib/featured";
import { BuyBar } from "./BuyBar";
import { Categories } from "./Categories";
import { Configurator } from "./Configurator";
import { FinalCta } from "./FinalCta";
import { Gallery } from "./Gallery";
import { Hero } from "./Hero";
import { Nav } from "./Nav";
import { Service } from "./Service";

/** A barra de compra só aparece depois do hero e some quando o fechamento entra na tela. */
function useBuyBarVisible(finalRef: React.RefObject<HTMLElement | null>) {
  const [heroGone, setHeroGone] = useState(false);
  const [finalIn, setFinalIn] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("topo");
    const heroObs = new IntersectionObserver(([e]) => setHeroGone(!e.isIntersecting && e.boundingClientRect.top < 0), {
      rootMargin: "0px 0px -35% 0px",
    });
    const finalObs = new IntersectionObserver(([e]) => setFinalIn(e.isIntersecting), { rootMargin: "0px 0px -25% 0px" });
    if (hero) heroObs.observe(hero);
    if (finalRef.current) finalObs.observe(finalRef.current);
    return () => {
      heroObs.disconnect();
      finalObs.disconnect();
    };
  }, [finalRef]);
  return heroGone && !finalIn;
}

export function Landing() {
  const { addToCart } = useEmChat();
  const [finish, setFinish] = useState(0);
  const [qty, setQty] = useState(1);
  const [addedFinish, setAddedFinish] = useState<number | null>(null);
  const finalRef = useRef<HTMLElement>(null);
  const barVisible = useBuyBarVisible(finalRef);

  const select = (i: number) => {
    setFinish(i);
    setQty(1);
  };
  const add = () => {
    addToCart(qty);
    setAddedFinish(finish);
  };

  return (
    <div className="min-h-dvh overflow-x-clip bg-em-bg text-base leading-normal text-em-text">
      <Nav />
      <main>
        <Hero />
        <Categories />
        <Service />
        <Configurator selected={finish} onSelect={select} qty={qty} onQty={setQty} onAdd={add} added={addedFinish === finish} />
        <Gallery />
        <FinalCta ref={finalRef} cfg={CONFIG_FINISHES[finish]} qty={qty} onAdd={add} />
      </main>
      <BuyBar cfg={CONFIG_FINISHES[finish]} onAdd={add} visible={barVisible} />
      <ChatWidget />
    </div>
  );
}
