import asyncio
import json

from emporio import mcp_server


def test_lista_as_ferramentas():
    tools = asyncio.run(mcp_server.mcp.list_tools())
    assert {t.name for t in tools} == {
        "buscar_produtos",
        "buscar_promocoes",
        "calcular_pagamento",
        "consultar_politicas",
        "status_loja",
        "consultar_pedido",
    }


def test_chama_ferramenta_pelo_mcp(store, monkeypatch):
    from emporio.tools import Ferramentas

    monkeypatch.setattr(mcp_server, "ferramentas", lambda: Ferramentas(store))
    result = asyncio.run(mcp_server.mcp.call_tool("calcular_pagamento", {"produto_id": 95}))
    payload = result.structured_content or json.loads(result.content[0].text)
    assert payload["pix"] == 2089.05
