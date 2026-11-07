"use client";

import { useSyncExternalStore } from "react";
import { getStoreStatus, type StoreStatus } from "./hours";

// Cache por minuto: getSnapshot precisa devolver o mesmo objeto enquanto nada mudou.
let cache: { minute: number; value: StoreStatus } | null = null;

function snapshot(): StoreStatus {
  const minute = Math.floor(Date.now() / 60_000);
  if (!cache || cache.minute !== minute) cache = { minute, value: getStoreStatus() };
  return cache.value;
}

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, 30_000);
  return () => clearInterval(timer);
}

/** Status ao vivo da loja. null no servidor (o horário depende do relógio do cliente). */
export function useStoreStatus(): StoreStatus | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
