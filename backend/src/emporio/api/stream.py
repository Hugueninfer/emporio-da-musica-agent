"""Converte a execução do agente no "UI message stream" do Vercel AI SDK (SSE).

Protocolo: https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol — cada evento é `data: {json}\\n\\n`
e o stream termina com `data: [DONE]`. O front já sabe renderizar texto, chamadas de ferramenta
(cards de produto/pedido, fonte do manual, formulário) e `data-suggestions` (botões).
"""

import json
import logging
import uuid
from collections.abc import AsyncIterator
from typing import Any

from langchain_core.messages import AIMessage, ToolMessage

from emporio.agent.prompt import SUGGESTIONS_CLOSE, SUGGESTIONS_OPEN
from emporio.metrics import TurnMetrics

log = logging.getLogger(__name__)

HEADERS = {
    "x-vercel-ai-ui-message-stream": "v1",
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
}


def sse(chunk: dict | str) -> str:
    return f"data: {chunk if isinstance(chunk, str) else json.dumps(chunk, ensure_ascii=False)}\n\n"


class SuggestionFilter:
    """Tira do texto a linha `<sugestoes>a | b</sugestoes>` que o modelo escreve no fim, mesmo quando
    o marcador chega quebrado entre dois pedaços do stream."""

    def __init__(self) -> None:
        self.buffer = ""
        self.inside = False
        self.suggestions: list[str] = []

    def feed(self, delta: str) -> str:
        self.buffer += delta
        out = ""
        while True:
            if self.inside:
                end = self.buffer.find(SUGGESTIONS_CLOSE)
                if end < 0:
                    return out
                self._parse(self.buffer[:end])
                self.buffer = self.buffer[end + len(SUGGESTIONS_CLOSE) :].lstrip("\n")
                self.inside = False
                continue
            start = self.buffer.find(SUGGESTIONS_OPEN)
            if start >= 0:
                out += self.buffer[:start]
                self.buffer = self.buffer[start + len(SUGGESTIONS_OPEN) :]
                self.inside = True
                continue
            keep = self._partial_marker()
            out += self.buffer[: len(self.buffer) - keep]
            self.buffer = self.buffer[len(self.buffer) - keep :]
            return out

    def flush(self) -> str:
        if self.inside:  # marcador sem fechamento: o que veio depois dele são as sugestões
            self._parse(self.buffer)
            rest = ""
        else:
            rest = self.buffer
        self.buffer, self.inside = "", False
        return rest

    def _partial_marker(self) -> int:
        for size in range(min(len(SUGGESTIONS_OPEN) - 1, len(self.buffer)), 0, -1):
            if SUGGESTIONS_OPEN.startswith(self.buffer[-size:]):
                return size
        return 0

    def _parse(self, raw: str) -> None:
        items = [s.strip(" \n-•") for s in raw.split("|")]
        self.suggestions = [s for s in items if s][:3]


async def canned_message(text: str) -> AsyncIterator[dict]:
    """Resposta pronta da Clave, sem chamar o modelo (limites de uso)."""
    text_id = f"txt_{uuid.uuid4().hex[:12]}"
    yield {"type": "start", "messageId": f"msg_{uuid.uuid4().hex}"}
    yield {"type": "text-start", "id": text_id}
    yield {"type": "text-delta", "id": text_id, "delta": text}
    yield {"type": "text-end", "id": text_id}
    yield {"type": "finish"}


def _json(content: Any) -> Any:
    if isinstance(content, str):
        try:
            return json.loads(content)
        except ValueError:
            return content
    return content


async def ui_message_stream(
    agent, inputs: dict, config: dict, metrics: TurnMetrics | None = None, *, expose: bool = False
) -> AsyncIterator[dict]:
    """Roda o agente e devolve os chunks do protocolo (dicts), do `start` ao `finish`.

    Com `metrics`, mede tokens, custo e latência. Com `expose`, o resumo também vai no `messageMetadata`
    do `finish` (avaliação e exemplos); no site fica só no servidor."""
    metrics = metrics or TurnMetrics(model="")

    def finish() -> dict:
        return {"type": "finish", "messageMetadata": metrics.summary()} if expose else {"type": "finish"}

    yield {"type": "start", "messageId": f"msg_{uuid.uuid4().hex}"}
    yield {"type": "start-step"}

    text_id: str | None = None
    filt = SuggestionFilter()
    announced: set[str] = set()

    def text(delta: str):
        nonlocal text_id
        if not delta:
            return
        if text_id is None:
            text_id = f"txt_{uuid.uuid4().hex[:12]}"
            metrics.first_token()
            yield {"type": "text-start", "id": text_id}
        yield {"type": "text-delta", "id": text_id, "delta": delta}

    def close_text():
        nonlocal text_id
        yield from text(filt.flush())
        if text_id is not None:
            yield {"type": "text-end", "id": text_id}
            text_id = None

    try:
        async for mode, payload in agent.astream(inputs, config, stream_mode=["messages", "updates"]):
            if mode == "messages":
                msg, meta = payload
                if isinstance(msg, AIMessage) and meta.get("langgraph_node") == "model":
                    for chunk in text(filt.feed(msg.text)):
                        yield chunk
                continue

            for node, update in (payload or {}).items():
                for msg in (update or {}).get("messages", []) if isinstance(update, dict) else []:
                    if isinstance(msg, AIMessage) and node == "model":
                        metrics.add_usage(msg.usage_metadata)
                    if isinstance(msg, AIMessage) and msg.tool_calls:
                        for chunk in close_text():
                            yield chunk
                        for call in msg.tool_calls:
                            if call["id"] in announced:
                                continue
                            announced.add(call["id"])
                            metrics.tool_started(call["id"], call["name"])
                            yield {"type": "tool-input-start", "toolCallId": call["id"], "toolName": call["name"]}
                            yield {
                                "type": "tool-input-available",
                                "toolCallId": call["id"],
                                "toolName": call["name"],
                                "input": call["args"],
                            }
                    elif isinstance(msg, ToolMessage):
                        metrics.tool_finished(msg.tool_call_id)
                        if msg.status == "error":
                            yield {"type": "tool-output-error", "toolCallId": msg.tool_call_id, "errorText": msg.text}
                        else:
                            yield {
                                "type": "tool-output-available",
                                "toolCallId": msg.tool_call_id,
                                "output": _json(msg.content),
                            }
    except Exception:  # o cliente vê o erro amigável da UI; o detalhe fica no log
        log.exception("falha ao rodar o agente")
        metrics.error = True
        for chunk in close_text():
            yield chunk
        yield {"type": "error", "errorText": "Não consegui responder agora. Tenta de novo em instantes?"}
        yield finish()
        return

    for chunk in close_text():
        yield chunk
    if filt.suggestions:
        yield {"type": "data-suggestions", "data": {"items": filt.suggestions}}
    yield {"type": "finish-step"}
    yield finish()
