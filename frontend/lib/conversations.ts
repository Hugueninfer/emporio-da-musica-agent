import type { EmUIMessage } from "./chat-types";

// Persistência local do histórico. Fallback enquanto o backend não expõe
// /conversas; a interface abaixo é a que a versão via API vai implementar.
const INDEX_KEY = "emporio.conversas.v1";
const messagesKey = (id: string) => `emporio.conversa.v1.${id}`;

export interface ConversationMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Modo privado / cota cheia: o chat segue funcionando só em memória.
  }
}

export const conversationStore = {
  list(): ConversationMeta[] {
    return read<ConversationMeta[]>(INDEX_KEY, []).sort((a, b) => b.updatedAt - a.updatedAt);
  },
  saveList(list: ConversationMeta[]) {
    write(INDEX_KEY, list);
  },
  messages(id: string): EmUIMessage[] {
    return read<EmUIMessage[]>(messagesKey(id), []);
  },
  saveMessages(id: string, messages: EmUIMessage[]) {
    write(messagesKey(id), messages);
  },
};

export function titleFrom(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 46 ? `${clean.slice(0, 45)}…` : clean;
}

export type ConversationGroup = "today" | "week" | "older";

export function groupOf(timestamp: number, now = Date.now()): ConversationGroup {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (timestamp >= startOfToday.getTime()) return "today";
  if (timestamp >= startOfToday.getTime() - 6 * 86_400_000) return "week";
  return "older";
}

/** Rótulo curto de quando foi a conversa: hora (hoje), "ontem" ou dia/mês. */
export function timeLabel(timestamp: number, fmt: { time: (ts: number) => string; shortDay: (ts: number) => string }, yesterday: string, now = Date.now()): string {
  if (groupOf(timestamp, now) === "today") return fmt.time(timestamp);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (timestamp >= startOfToday.getTime() - 86_400_000) return yesterday;
  return fmt.shortDay(timestamp);
}
