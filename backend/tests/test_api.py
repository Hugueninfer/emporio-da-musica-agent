import json

import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import InMemorySaver

from emporio.agent.graph import build_agent
from emporio.api.app import create_app
from emporio.metrics import MetricsLog
from emporio.tools import Ferramentas
from tests.fakes import ScriptedModel, tool_call


def ui(role, text, id="m"):
    return {"id": id, "role": role, "parts": [{"type": "text", "text": text}]}


def events(response):
    out = []
    for line in response.text.splitlines():
        if line.startswith("data: "):
            data = line[6:]
            out.append(data if data == "[DONE]" else json.loads(data))
    return out


@pytest.fixture
def setup(store):
    def make(*script):
        model = ScriptedModel(script=list(script))
        f = Ferramentas(store)
        app = create_app(build_agent(model, f, InMemorySaver()), f, MetricsLog(None))
        return TestClient(app), model

    return make


def test_stream_com_cabecalho_do_ai_sdk(setup):
    client, _ = setup(AIMessage("Oi! Sou a Clave."))
    with client:
        r = client.post("/api/chat", json={"id": "c1", "locale": "pt", "messages": [ui("user", "oi")]})
    assert r.status_code == 200
    assert r.headers["x-vercel-ai-ui-message-stream"] == "v1"
    ev = events(r)
    assert ev[-1] == "[DONE]" and ev[-2]["type"] == "finish"
    assert "".join(e["delta"] for e in ev if isinstance(e, dict) and e["type"] == "text-delta") == "Oi! Sou a Clave."


def test_formulario_verifica_sem_passar_contato_ao_modelo(setup):
    client, model = setup(tool_call("consultar_pedido", {"pedido": "8"}), AIMessage("Seu pedido saiu!"))
    with client:
        r = client.post(
            "/api/chat",
            json={
                "id": "c2",
                "locale": "pt",
                "messages": [ui("user", "Pedido #8 · tel. final 7821")],
                "verificacao": {"pedido": "8", "contato": "(67) 99654-7821"},
            },
        )
    ev = events(r)
    out = next(e for e in ev if isinstance(e, dict) and e["type"] == "tool-output-available")
    assert out["output"]["verificado"] is True and out["output"]["pedido"]["numero"] == 8

    sent_to_model = " ".join(str(m.content) for m in model.calls[0])
    assert "99654" not in sent_to_model
    assert "verificação do pedido 8 aprovada" in sent_to_model


def test_contato_digitado_no_chat_e_verificado_e_ocultado(setup):
    client, model = setup(AIMessage("Achei!"))
    with client:
        client.post(
            "/api/chat",
            json={"id": "c3", "messages": [ui("user", "meu pedido 8, telefone (67) 99654-7821")]},
        )
    human = [m for m in model.calls[0] if isinstance(m, HumanMessage)][-1].content
    assert "99654" not in human and "[contato oculto]" in human and "aprovada" in human


def test_contato_errado_avisa_o_modelo(setup):
    client, model = setup(AIMessage("Não conferiu."))
    with client:
        client.post(
            "/api/chat",
            json={
                "id": "c4",
                "messages": [ui("user", "Pedido #8")],
                "verificacao": {"pedido": "8", "contato": "(67) 90000-0000"},
            },
        )
    human = [m for m in model.calls[0] if isinstance(m, HumanMessage)][-1].content
    assert "falhou" in human


def test_recupera_historico_quando_servidor_nao_conhece_a_conversa(setup):
    client, model = setup(AIMessage("Claro!"))
    with client:
        client.post(
            "/api/chat",
            json={
                "id": "c5",
                "messages": [
                    ui("user", "quero um violão", "1"),
                    ui("assistant", "Pra qual estilo?", "2"),
                    ui("user", "folk", "3"),
                ],
            },
        )
    textos = [m.content for m in model.calls[0][1:]]
    assert textos[:2] == ["quero um violão", "Pra qual estilo?"]
    assert textos[2].startswith("folk")


def test_health(setup):
    client, _ = setup()
    with client:
        assert client.get("/health").json()["ok"] is True


def test_contexto_vai_na_mensagem_do_cliente(setup):
    client, model = setup(AIMessage("Hi!"))
    with client:
        client.post("/api/chat", json={"id": "c6", "locale": "pt", "messages": [ui("user", "Do you sell ukuleles?")]})
    human = [m for m in model.calls[0] if isinstance(m, HumanMessage)][-1].content
    assert human.startswith("Do you sell ukuleles?")
    assert "[System context:" in human and "the customer wrote in English" in human


def test_tentar_novamente_nao_duplica_a_mensagem(setup):
    # 1ª tentativa falha (script vazio → erro); a retentativa refaz o turno sem repetir o pedido
    client, model = setup()
    body = {"id": "c7", "messages": [ui("user", "tem ukulele?")]}
    with client:
        primeira = events(client.post("/api/chat", json=body))
        assert any(isinstance(e, dict) and e["type"] == "error" for e in primeira)
        model.script.append(AIMessage("Tem sim!"))
        client.post("/api/chat", json=body | {"trigger": "regenerate-message"})
    humanos = [m for m in model.calls[-1] if isinstance(m, HumanMessage)]
    assert len(humanos) == 1 and humanos[0].content.startswith("tem ukulele?")


def test_tentar_novamente_nao_apaga_turno_anterior(setup):
    # se a falha foi antes de o servidor salvar a mensagem, a retentativa não mexe no turno anterior
    client, model = setup(AIMessage("Oi!"), AIMessage("Tem sim!"))
    with client:
        client.post("/api/chat", json={"id": "c8", "messages": [ui("user", "oi", "1")]})
        msgs = [ui("user", "oi", "1"), ui("assistant", "Oi!", "2"), ui("user", "tem ukulele?", "3")]
        client.post("/api/chat", json={"id": "c8", "messages": msgs, "trigger": "regenerate-message"})
    humanos = [m.content for m in model.calls[-1] if isinstance(m, HumanMessage)]
    assert len(humanos) == 2 and humanos[0].startswith("oi") and humanos[1].startswith("tem ukulele?")
