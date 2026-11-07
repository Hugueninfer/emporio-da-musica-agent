import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import type { EmUIMessage, VerificationPayload } from "@/lib/chat-types";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/config";
import { runMockAgent } from "@/lib/mock/agent";

/**
 * Endpoint MOCK do useChat. O agente real (Python/FastAPI) vai expor o mesmo contrato:
 * POST { id, messages, locale, verificacao? } → UI message stream (SSE, header x-vercel-ai-ui-message-stream: v1).
 */
export async function POST(req: Request) {
  const body: { messages: EmUIMessage[]; verificacao?: VerificationPayload; locale?: string } = await req.json();
  const locale: Locale = LOCALES.includes(body.locale as Locale) ? (body.locale as Locale) : DEFAULT_LOCALE;

  const stream = createUIMessageStream<EmUIMessage>({
    execute: ({ writer }) => runMockAgent(writer, body.messages, body.verificacao, locale, req.signal),
    onError: (error) => (error instanceof Error ? error.message : "Erro desconhecido"),
  });

  return createUIMessageStreamResponse({ stream });
}
