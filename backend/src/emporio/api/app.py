"""API HTTP da Clave. `POST /api/chat` fala o protocolo de stream do Vercel AI SDK.

uv run uvicorn emporio.api.app:app --reload --port 8000
"""

import logging
import os
import re
from contextlib import asynccontextmanager
from typing import Any, Literal, NamedTuple

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, RemoveMessage, ToolMessage
from pydantic import BaseModel, Field

from emporio import config
from emporio.agent.graph import build_agent
from emporio.agent.prompt import turn_context
from emporio.api.language import detect_language
from emporio.api.privacy import AttemptLimiter, find_verification, redact
from emporio.api.stream import HEADERS, sse, ui_message_stream
from emporio.metrics import MetricsLog, TurnMetrics
from emporio.tools import Ferramentas

log = logging.getLogger("emporio")


class UIMessage(BaseModel):
    id: str | None = None
    role: Literal["user", "assistant", "system"]
    parts: list[dict[str, Any]] = Field(default_factory=list)


class Verificacao(BaseModel):
    pedido: str
    contato: str


class ChatRequest(BaseModel):
    id: str
    messages: list[UIMessage]
    locale: Literal["pt", "en"] = "pt"
    verificacao: Verificacao | None = None
    # "regenerate-message" quando o cliente clica em "Tentar novamente"
    trigger: str | None = None


class Turn(NamedTuple):
    """O que o modelo recebe nesta vez."""

    texto: str  # mensagem do cliente sem contato, com as notas do sistema
    verificacoes: dict  # número do pedido → resultado da verificação feita pela API
    idioma: str | None  # idioma detectado na mensagem ("pt"/"en"), se der para saber


def text_of(message: UIMessage) -> str:
    return "".join(p.get("text", "") for p in message.parts if p.get("type") == "text").strip()


def last_text(req: ChatRequest) -> str:
    last = next((m for m in reversed(req.messages) if m.role == "user"), None)
    return text_of(last) if last else ""


def verification_note(numero: str, result: dict) -> str:
    if result.get("verificado"):
        return f"[Nota do sistema: verificação do pedido {numero} aprovada. Consulte com consultar_pedido.]"
    return f"[Nota do sistema: verificação do pedido {numero} falhou — número e contato não conferem.]"


TOO_MANY_ATTEMPTS = (
    "[Nota do sistema: muitas tentativas de verificação que não conferiram. Não verifique agora; peça para "
    "o cliente tentar mais tarde ou falar com a equipe pelo WhatsApp (67) 3341-4444.]"
)


def prepare_turn(
    req: ChatRequest, ferramentas: Ferramentas, limiter: AttemptLimiter | None = None, origin: str = ""
) -> Turn:
    """Mensagem da vez para o modelo e as verificações de pedido feitas pela API (o contato fica aqui)."""
    raw = last_text(req)
    idioma = detect_language(raw)
    text = redact(raw)
    dados = req.verificacao.model_dump() if req.verificacao else find_verification(raw)
    verificacoes: dict = {}
    if dados and limiter and limiter.blocked(origin):
        text = f"{text}\n\n{TOO_MANY_ATTEMPTS}"
    elif dados:
        numero = re.sub(r"\D", "", dados["pedido"])
        result = ferramentas.consultar_pedido(numero, dados["contato"])
        if not result.get("verificado") and limiter:
            limiter.failed(origin)
        verificacoes[numero] = result
        text = f"{text}\n\n{verification_note(numero, result)}"
    return Turn(f"{text}\n\n{turn_context(config.now(), req.locale, idioma)}", verificacoes, idioma)


def history_seed(req: ChatRequest) -> list[BaseMessage]:
    """Quando o servidor não conhece a conversa (ex.: reiniciou sem o banco), recupera o texto dela."""
    seed: list[BaseMessage] = []
    for m in req.messages[:-1]:
        text = text_of(m)
        if text and m.role == "user":
            seed.append(HumanMessage(redact(text)))
        elif text and m.role == "assistant":
            seed.append(AIMessage(text))
    return seed


async def drop_retried_turn(graph, cfg: dict, user_text: str) -> None:
    """Retentativa: o turno que falhou (mensagem do cliente + o que veio depois) sai do histórico,
    para a mensagem não ficar duplicada. Só mexe se o último turno salvo for mesmo essa mensagem —
    se a falha foi antes de o servidor salvar, não há o que tirar."""
    state = await graph.aget_state(cfg)
    msgs = state.values.get("messages", []) if state else []
    last_human = next((i for i in range(len(msgs) - 1, -1, -1) if isinstance(msgs[i], HumanMessage)), None)
    if last_human is None or not str(msgs[last_human].content).startswith(redact(user_text)):
        return
    await graph.aupdate_state(cfg, {"messages": [RemoveMessage(id=m.id) for m in msgs[last_human:]]})


def unanswered_tool_calls(messages: list[BaseMessage]) -> list[ToolMessage]:
    """Respostas para chamadas de ferramenta que ficaram sem resultado.

    Acontece quando o cliente clica em "Parar" depois de o modelo pedir uma ferramenta e antes de ela
    rodar: a API da Anthropic recusa um histórico com `tool_use` sem `tool_result`, e a conversa
    quebraria em todas as mensagens seguintes."""
    answered = {m.tool_call_id for m in messages if isinstance(m, ToolMessage)}
    return [
        ToolMessage(
            content='{"erro": "interrompido: o cliente parou a resposta antes de a consulta terminar"}',
            tool_call_id=call["id"],
            name=call["name"],
            status="error",
        )
        for m in messages
        if isinstance(m, AIMessage)
        for call in m.tool_calls
        if call["id"] not in answered
    ]


def create_app(agent=None, ferramentas: Ferramentas | None = None, metrics: MetricsLog | None = None) -> FastAPI:
    """`agent`/`ferramentas`/`metrics` podem ser injetados nos testes; em produção são criados no startup."""

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.ferramentas = ferramentas or Ferramentas()
        app.state.metrics = metrics or MetricsLog(config.METRICS_PATH)
        app.state.limiter = AttemptLimiter()
        if agent is not None:
            app.state.agent = agent
            yield
            return
        from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

        config.VAR_DIR.mkdir(parents=True, exist_ok=True)
        async with AsyncSqliteSaver.from_conn_string(str(config.CHECKPOINTS_PATH)) as saver:
            app.state.agent = build_agent(ferramentas=app.state.ferramentas, checkpointer=saver)
            yield

    app = FastAPI(title="Clave — Empório da Música", lifespan=lifespan)
    origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["POST", "GET", "OPTIONS"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health():
        return {"ok": True, "modelo": config.MODEL, "chave_configurada": bool(os.getenv("ANTHROPIC_API_KEY"))}

    @app.get("/metrics")
    async def metrics_report():
        """Custo, tokens, cache e latência agregados das respostas (últimas 2000)."""
        return app.state.metrics.report()

    @app.post("/api/chat")
    async def chat(req: ChatRequest, request: Request):
        graph = app.state.agent
        origin = request.client.host if request.client else ""
        turn = prepare_turn(req, app.state.ferramentas, app.state.limiter, origin)
        cfg = {"configurable": {"thread_id": req.id}, "recursion_limit": 25}

        if req.trigger == "regenerate-message":
            await drop_retried_turn(graph, cfg, last_text(req))

        state = await graph.aget_state(cfg)
        history = state.values.get("messages", []) if state else []
        messages: list[BaseMessage] = unanswered_tool_calls(history) if history else history_seed(req)
        messages.append(HumanMessage(turn.texto))

        inputs: dict = {"messages": messages, "idioma": turn.idioma}
        if turn.verificacoes:
            inputs["verificacoes"] = turn.verificacoes

        metrics = TurnMetrics(model=config.MODEL, thread_id=req.id)

        async def body():
            try:
                async for chunk in ui_message_stream(graph, inputs, cfg, metrics, expose=config.STREAM_METRICS):
                    yield sse(chunk)
                yield sse("[DONE]")
            finally:  # registra também respostas interrompidas ("Parar" ou conexão caída): elas custam tokens
                record(metrics)

        return StreamingResponse(body(), media_type="text/event-stream", headers=HEADERS)

    def record(metrics: TurnMetrics) -> None:
        summary = metrics.summary()
        app.state.metrics.record(summary)
        log.info(
            "resposta em %sms (1º token %sms) · %s chamada(s) ao modelo · cache %.0f%% · R$ %.4f · %s",
            summary["latencia_ms"],
            summary["primeiro_token_ms"],
            summary["chamadas_modelo"],
            summary["cache_hit"] * 100,
            summary["custo_brl"],
            ", ".join(f"{t['nome']} {t['ms']}ms" for t in summary["ferramentas"]) or "sem ferramentas",
        )

    return app


logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
app = create_app()
