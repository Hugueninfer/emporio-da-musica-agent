"use client";

import { createContext, useContext } from "react";
import type { Product } from "@/lib/catalog";

/** Onde a conversa está sendo exibida e o que fazer quando o cliente pede "Ver em 3D". */
export interface ChatSurface {
  variant: "widget" | "full";
  onViewProduct: (product: Product) => void;
}

export const ChatSurfaceContext = createContext<ChatSurface>({ variant: "full", onViewProduct: () => {} });

export const useChatSurface = () => useContext(ChatSurfaceContext);
