import type { Metadata } from "next";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { pt } from "@/lib/i18n/pt";

export const metadata: Metadata = { title: pt.meta.assistantTitle };

export default function AssistentePage() {
  return <ChatLayout />;
}
