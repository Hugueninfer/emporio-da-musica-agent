"""API HTTP da Clave. `POST /api/chat` fala o protocolo de stream do Vercel AI SDK.

uv run uvicorn emporio.api.app:app --reload --port 8000
"""

import logging
import os
import re
from contextlib import asynccontextmanager
from typing import Any, Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, RemoveMessage
from pydantic import BaseModel, Field

from emporio import config
from emporio.agent.graph import build_agent
from emporio.agent.prompt import turn_context
from emporio.api.language import detect_language
from emporio.api.privacy import find_verification, redact
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


def text_of(message: UIMessage) -> str:
    return "".join(p.get("text", "") for p in message.parts if p.get("type") == "text").strip()


def last_text(req: "ChatRequest") -> str:
    last = next((m for m in reversed(req.messages) if m.role == "user"), None)
    return text_of(last) if last else ""


def verification_note(numero: str, result: dict) -> str:
    if result.get("verificado"):
        return f"[Nota do sistema: verificação do pedido {numero} aprovada. Consulte com consultar_pedido.]"
    return f"[Nota do sistema: verificação do pedido {numero} falhou — número e contato não conferem.]"


def prepare_turn(req: ChatRequest, ferramentas: Ferramentas) -> tuple[str, dict]:
    """Texto da vez para o modelo (sem contato, com as notas do sistema) e as verificações feitas pela API."""
    text = last_text(req)
    context = turn_context(config.now(), req.locale, detect_language(text))
    dados = req.verificacao.model_dump() if req.verificacao else find_verification(text)
    verificacoes: dict = {}
    if dados:
        numero = re.sub(r"\D", "", dados["pedido"])
        result = ferramentas.consultar_pedido(numero, dados["contato"])
        verificacoes[numero] = result
        text = f"{redact(text)}\n\n{verification_note(numero, result)}"
    else:
        text = redact(text)
    return f"{text}\n\n{context}", verificacoes


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


def create_app(agent=None, ferramentas: Ferramentas | None = None, metrics: MetricsLog | None = None) -> FastAPI:
    """`agent`/`ferramentas`/`metrics` podem ser injetados nos testes; em produção são criados no startup."""

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.ferramentas = ferramentas or Ferramentas()
        app.state.metrics = metrics or MetricsLog(config.METRICS_PATH)
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
    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
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
    async def chat(req: ChatRequest):
        graph = app.state.agent
        text, verificacoes = prepare_turn(req, app.state.ferramentas)
        cfg = {"configurable": {"thread_id": req.id}, "recursion_limit": 25}

        if req.trigger == "regenerate-message":
            await drop_retried_turn(graph, cfg, last_text(req))

        messages: list[BaseMessage] = []
        state = await graph.aget_state(cfg)
        if not (state and state.values.get("messages")):
            messages += history_seed(req)
        messages.append(HumanMessage(text))

        inputs: dict = {"messages": messages, "idioma": detect_language(last_text(req))}
        if verificacoes:
            inputs["verificacoes"] = verificacoes

        turn = TurnMetrics(model=config.MODEL, thread_id=req.id)

        async def body():
            async for chunk in ui_message_stream(graph, inputs, cfg, turn):
                yield sse(chunk)
            yield sse("[DONE]")
            summary = turn.summary()
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

        return StreamingResponse(body(), media_type="text/event-stream", headers=HEADERS)

    return app


logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
app = create_app()
