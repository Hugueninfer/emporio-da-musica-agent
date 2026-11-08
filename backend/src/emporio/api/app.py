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
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from pydantic import BaseModel, Field

from emporio import config
from emporio.agent.graph import ClaveContext, build_agent
from emporio.api.privacy import find_verification, redact
from emporio.api.stream import HEADERS, sse, ui_message_stream
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


def text_of(message: UIMessage) -> str:
    return "".join(p.get("text", "") for p in message.parts if p.get("type") == "text").strip()


def verification_note(numero: str, result: dict) -> str:
    if result.get("verificado"):
        return f"[Nota do sistema: verificação do pedido {numero} aprovada. Consulte com consultar_pedido.]"
    return f"[Nota do sistema: verificação do pedido {numero} falhou — número e contato não conferem.]"


def prepare_turn(req: ChatRequest, ferramentas: Ferramentas) -> tuple[str, dict]:
    """Texto da vez para o modelo (sem contato) e as verificações feitas pela API."""
    last = next((m for m in reversed(req.messages) if m.role == "user"), None)
    text = text_of(last) if last else ""
    dados = req.verificacao.model_dump() if req.verificacao else find_verification(text)
    verificacoes: dict = {}
    if dados:
        numero = re.sub(r"\D", "", dados["pedido"])
        result = ferramentas.consultar_pedido(numero, dados["contato"])
        verificacoes[numero] = result
        text = f"{redact(text)}\n\n{verification_note(numero, result)}"
    else:
        text = redact(text)
    return text, verificacoes


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


def create_app(agent=None, ferramentas: Ferramentas | None = None) -> FastAPI:
    """`agent`/`ferramentas` podem ser injetados nos testes; em produção são criados no startup."""

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.ferramentas = ferramentas or Ferramentas()
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

    @app.post("/api/chat")
    async def chat(req: ChatRequest):
        graph = app.state.agent
        text, verificacoes = prepare_turn(req, app.state.ferramentas)
        cfg = {"configurable": {"thread_id": req.id}, "recursion_limit": 25}

        messages: list[BaseMessage] = []
        state = await graph.aget_state(cfg)
        if not (state and state.values.get("messages")):
            messages += history_seed(req)
        messages.append(HumanMessage(text))

        inputs: dict = {"messages": messages}
        if verificacoes:
            inputs["verificacoes"] = verificacoes

        async def body():
            async for chunk in ui_message_stream(graph, inputs, cfg, ClaveContext(locale=req.locale)):
                yield sse(chunk)
            yield sse("[DONE]")

        return StreamingResponse(body(), media_type="text/event-stream", headers=HEADERS)

    return app


logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
app = create_app()
