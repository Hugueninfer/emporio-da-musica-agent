"use client";

import { Chat, useChat } from "@ai-sdk/react";
import { DefaultChatTransport, generateId } from "ai";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/lib/catalog";
import type { EmUIMessage, VerificationPayload } from "@/lib/chat-types";
import { conversationStore, titleFrom, type ConversationMeta } from "@/lib/conversations";
import { FEATURED } from "@/lib/featured";
import type { Locale } from "@/lib/i18n/config";
import { useI18n } from "@/components/i18n/I18nProvider";

/** Endpoint do agente. Hoje um mock em /api/chat; depois o FastAPI (mesmo protocolo de stream). */
const CHAT_API = process.env.NEXT_PUBLIC_CHAT_API ?? "/api/chat";

/** Idioma da página, enviado em toda requisição (o agente responde no idioma do cliente). */
let currentLocale: Locale = "en";
const transport = new DefaultChatTransport<EmUIMessage>({ api: CHAT_API, body: () => ({ locale: currentLocale }) });

function createChat(id: string, messages: EmUIMessage[] = []) {
  return new Chat<EmUIMessage>({ id, messages, transport });
}

interface ChatContextValue {
  chat: Chat<EmUIMessage>;
  activeId: string;
  activeMeta: ConversationMeta | undefined;
  conversations: ConversationMeta[];
  newConversation: () => void;
  selectConversation: (id: string) => void;
  sendText: (text: string, verification?: VerificationPayload) => void;
  widgetOpen: boolean;
  setWidgetOpen: (open: boolean) => void;
  /** Produto exibido no painel "Em foco" (360°). */
  focus: Product;
  setFocus: (product: Product) => void;
  cartCount: number;
  addToCart: (qty: number) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useEmChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useEmChat precisa estar dentro de <ChatProvider>");
  return ctx;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  useEffect(() => {
    currentLocale = locale;
  }, [locale]);
  // Id provisório no servidor; o definitivo (aleatório) é gerado no cliente, logo após hidratar.
  const [chat, setChat] = useState(() => createChat("pendente"));
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [focus, setFocus] = useState<Product>(FEATURED.natural);
  const [cartCount, setCartCount] = useState(0);

  // Restaura a conversa mais recente depois da hidratação (localStorage só existe no cliente).
  useEffect(() => {
    const list = conversationStore.list();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com armazenamento externo
    setConversations(list);
    setChat(list[0] ? createChat(list[0].id, conversationStore.messages(list[0].id)) : createChat(generateId()));
  }, []);

  const touch = useCallback((id: string, firstText?: string) => {
    setConversations((prev) => {
      const now = Date.now();
      const existing = prev.find((c) => c.id === id);
      const next: ConversationMeta = existing
        ? { ...existing, updatedAt: now }
        : { id, title: titleFrom(firstText ?? "Nova conversa"), createdAt: now, updatedAt: now };
      const list = [next, ...prev.filter((c) => c.id !== id)];
      conversationStore.saveList(list);
      return list;
    });
  }, []);

  const sendText = useCallback(
    (text: string, verification?: VerificationPayload) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      touch(chat.id, trimmed);
      void chat.sendMessage({ text: trimmed }, verification ? { body: { verificacao: verification } } : undefined);
    },
    [chat, touch],
  );

  const newConversation = useCallback(() => {
    if (chat.messages.length === 0) return;
    void chat.stop();
    setChat(createChat(generateId()));
  }, [chat]);

  const selectConversation = useCallback(
    (id: string) => {
      if (id === chat.id) return;
      void chat.stop();
      setChat(createChat(id, conversationStore.messages(id)));
    },
    [chat],
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      chat,
      activeId: chat.id,
      activeMeta: conversations.find((c) => c.id === chat.id),
      conversations,
      newConversation,
      selectConversation,
      sendText,
      widgetOpen,
      setWidgetOpen,
      focus,
      setFocus,
      cartCount,
      addToCart: (qty) => setCartCount((n) => n + qty),
    }),
    [chat, conversations, newConversation, selectConversation, sendText, widgetOpen, focus, cartCount],
  );

  return (
    <ChatContext.Provider value={value}>
      <ChatPersistence chat={chat} onSaved={touch} />
      {children}
    </ChatContext.Provider>
  );
}

/** Salva as mensagens quando uma resposta termina (ou falha). */
function ChatPersistence({ chat, onSaved }: { chat: Chat<EmUIMessage>; onSaved: (id: string) => void }) {
  const { messages, status } = useChat({ chat });
  useEffect(() => {
    if (status === "streaming" || status === "submitted" || messages.length === 0) return;
    conversationStore.saveMessages(chat.id, messages);
    onSaved(chat.id);
  }, [chat.id, messages, status, onSaved]);
  return null;
}
