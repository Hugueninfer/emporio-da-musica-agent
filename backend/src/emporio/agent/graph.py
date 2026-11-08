"""O agente: `create_agent` do LangChain (grafo LangGraph) com Claude e as ferramentas da loja."""

from typing import Annotated

from langchain.agents import AgentState, create_agent
from langchain.agents.middleware import ModelCallLimitMiddleware
from langchain_anthropic.middleware import AnthropicPromptCachingMiddleware
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import SystemMessage
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
        ],
        state_schema=ClaveState,
        checkpointer=checkpointer,
        name="clave",
    )
