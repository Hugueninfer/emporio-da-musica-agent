"use client";

import { RotateCw, WifiOff } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

export function ErrorCard({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="flex items-start gap-3.5 rounded-[14px] border border-em-err-line bg-em-err-bg px-4 py-3.5">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-em-err-icon-bg text-em-err-icon-fg">
        <WifiOff size={18} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 grow flex-col gap-1">
        <span className="font-semibold">{t.chat.errorTitle}</span>
        <span className="text-sm text-em-text-2">{t.chat.errorBody}</span>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex h-10 items-center gap-2 self-start rounded-xl bg-em-accent px-4 text-sm font-semibold text-em-on-accent"
        >
          <RotateCw size={16} strokeWidth={2} aria-hidden="true" />
          {t.chat.retry}
        </button>
      </div>
    </div>
  );
}
