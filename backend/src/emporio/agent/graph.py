"""O agente: `create_agent` do LangChain (grafo LangGraph) com Claude e as ferramentas da loja."""

import json
from typing import Annotated, NotRequired

from langchain.agents import AgentState, create_agent
from langchain.agents.middleware import AgentMiddleware, ModelCallLimitMiddleware, ToolCallRequest
from langchain_anthropic.middleware import AnthropicPromptCachingMiddleware
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import SystemMessage, ToolMessage
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph.state import CompiledStateGraph

from emporio import config
from emporio.agent.prompt import SYSTEM_PROMPT
from emporio.agent.tools import build_tools
from emporio.tools import Ferramentas


def _merge(old: dict | None, new: dict | None) -> dict:
    return {**(old or {}), **(new or {})}


class ClaveState(AgentState):
    # número do pedido → resultado da verificação feita pela API (sem o contato do cliente)
    verificacoes: Annotated[dict, _merge]
    # idioma detectado na última mensagem do cliente ("pt"/"en"), ou None quando não deu para saber
    idioma: NotRequired[str | None]


RESPONDER_EM = {
    "pt": "português — o cliente escreveu em português",
    "en": "inglês — o cliente escreveu em inglês (traduza os dados acima)",
}


class LembreteDeIdioma(AgentMiddleware):
    """Anota no resultado de cada ferramenta o idioma da resposta.

    Os dados da loja vêm em português, e o modelo escreve a resposta logo depois do resultado da
    ferramenta: numa conversa que começou em português, a Clave chegou a responder em português a um
    cliente que tinha acabado de escrever em inglês. O lembrete fica exatamente onde o texto começa.
    """

    @staticmethod
    def _annotate(request: ToolCallRequest, msg):
        idioma = (request.state or {}).get("idioma")
        if idioma not in RESPONDER_EM or not isinstance(msg, ToolMessage) or not isinstance(msg.content, str):
            return msg
        try:
            data = json.loads(msg.content)
        except ValueError:
            return msg
        if not isinstance(data, dict):
            return msg
        data["responder_em"] = RESPONDER_EM[idioma]
        return msg.model_copy(update={"content": json.dumps(data, ensure_ascii=False)})

    def wrap_tool_call(self, request, handler):
        return self._annotate(request, handler(request))

    async def awrap_tool_call(self, request, handler):
        return self._annotate(request, await handler(request))


# Prompt de sistema 100% fixo: (1) o cache da Anthropic reaproveita o prefixo inteiro em todas as
# conversas e (2) os blocos de raciocínio assinados que ficam no histórico continuam válidos — eles
# só valem com o mesmo prompt de sistema. O que muda a cada mensagem (data, idioma, verificação) vai
# junto da mensagem do cliente (ver emporio.api.app.prepare_turn).
SYSTEM = SystemMessage(content=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}])


def default_model() -> BaseChatModel:
    from langchain_anthropic import ChatAnthropic

    return ChatAnthropic(model=config.MODEL, max_tokens=1500, timeout=60, max_retries=2)


def build_agent(
    model: BaseChatModel | None = None,
    ferramentas: Ferramentas | None = None,
    checkpointer: BaseCheckpointSaver | None = None,
) -> CompiledStateGraph:
    return create_agent(
        model or default_model(),
        build_tools(ferramentas or Ferramentas()),
        system_prompt=SYSTEM,
        middleware=[
            # cache também nas ferramentas e no histórico da conversa (até 4 pontos de cache por chamada)
            AnthropicPromptCachingMiddleware(unsupported_model_behavior="ignore"),
            ModelCallLimitMiddleware(run_limit=8, exit_behavior="end"),
            LembreteDeIdioma(),
        ],
        state_schema=ClaveState,
        checkpointer=checkpointer,
        name="clave",
    )
