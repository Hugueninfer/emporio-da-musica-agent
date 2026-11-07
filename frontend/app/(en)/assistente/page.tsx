import type { Metadata } from "next";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { en } from "@/lib/i18n/en";

export const metadata: Metadata = { title: en.meta.assistantTitle };

export default function AssistantPage() {
  return <ChatLayout />;
}
