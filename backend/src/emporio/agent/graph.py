"""O agente: `create_agent` do LangChain (grafo LangGraph) com Claude e as ferramentas da loja."""

from dataclasses import dataclass
from typing import Annotated

from langchain.agents import AgentState, create_agent
from langchain.agents.middleware import ModelCallLimitMiddleware, ModelRequest, dynamic_prompt
from langchain_anthropic.middleware import AnthropicPromptCachingMiddleware
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import SystemMessage
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph.state import CompiledStateGraph

from emporio import config
from emporio.agent.prompt import SYSTEM_PROMPT, context_block
from emporio.agent.tools import build_tools
from emporio.tools import Ferramentas


def _merge(old: dict | None, new: dict | None) -> dict:
    return {**(old or {}), **(new or {})}


class ClaveState(AgentState):
    # número do pedido → resultado da verificação feita pela API (sem o contato do cliente)
    verificacoes: Annotated[dict, _merge]


@dataclass
class ClaveContext:
    """Dados da requisição que não fazem parte da conversa."""

    locale: str = "pt"


@dynamic_prompt
def clave_prompt(request: ModelRequest) -> SystemMessage:
    """Persona fixa (em cache) + data e idioma da página."""
    ctx = request.runtime.context or ClaveContext()
    return SystemMessage(
        content=[
            {"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}},
            {"type": "text", "text": context_block(config.now(), ctx.locale)},
        ]
    )


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
        middleware=[
            clave_prompt,
            # cache também nas ferramentas e no histórico da conversa (até 4 pontos de cache por chamada)
            AnthropicPromptCachingMiddleware(unsupported_model_behavior="ignore"),
            ModelCallLimitMiddleware(run_limit=8, exit_behavior="end"),
        ],
        state_schema=ClaveState,
        context_schema=ClaveContext,
        checkpointer=checkpointer,
        name="clave",
    )
