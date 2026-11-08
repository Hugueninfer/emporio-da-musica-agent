"""Modelo de chat roteirizado: devolve as mensagens na ordem e grava o que recebeu."""

from collections.abc import Iterator

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, AIMessageChunk, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult


class ScriptedModel(BaseChatModel):
    script: list[AIMessage]
    calls: list[list[BaseMessage]] = []

    @property
    def _llm_type(self) -> str:
        return "scripted"

    def bind_tools(self, tools, **kwargs):
        return self

    def _next(self, messages: list[BaseMessage]) -> AIMessage:
        self.calls.append(list(messages))
        return self.script.pop(0)

    def _generate(self, messages, stop=None, run_manager=None, **kwargs) -> ChatResult:
        return ChatResult(generations=[ChatGeneration(message=self._next(messages))])

    def _stream(self, messages, stop=None, run_manager=None, **kwargs) -> Iterator[ChatGenerationChunk]:
        msg = self._next(messages)
        if msg.tool_calls:
            chunk = AIMessageChunk(
                content=msg.content,
                id=msg.id,
                usage_metadata=msg.usage_metadata,
                tool_call_chunks=[
                    {"name": tc["name"], "args": __import__("json").dumps(tc["args"]), "id": tc["id"], "index": i}
                    for i, tc in enumerate(msg.tool_calls)
                ],
            )
            yield ChatGenerationChunk(message=chunk)
            return
        # texto em pedaços pequenos, como um modelo real
        text = msg.content
        for i in range(0, len(text), 7):
            last = i + 7 >= len(text)
            piece = AIMessageChunk(
                content=text[i : i + 7], id=msg.id, usage_metadata=msg.usage_metadata if last else None
            )
            chunk = ChatGenerationChunk(message=piece)
            if run_manager:
                run_manager.on_llm_new_token(chunk.text, chunk=chunk)
            yield chunk


def tool_call(name: str, args: dict | None = None, id: str = "call_1") -> AIMessage:
    return AIMessage(content="", tool_calls=[{"name": name, "args": args or {}, "id": id}])
