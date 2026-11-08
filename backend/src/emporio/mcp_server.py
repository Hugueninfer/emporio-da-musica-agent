"""Servidor MCP com as mesmas ferramentas da Clave.

Qualquer cliente MCP (Claude Desktop, Claude Code, outro agente) passa a consultar catálogo,
promoções, pagamento, manual e pedidos da loja. O agente do site chama as funções direto, sem MCP:
assim o servidor é uma interface a mais e não um ponto de falha do chat.

    uv run python -m emporio.mcp_server            # stdio
    uv run python -m emporio.mcp_server --http     # streamable HTTP em :8001/mcp
"""

import sys
from functools import cache
from typing import Annotated, Literal

from mcp.server.mcpserver import MCPServer
from pydantic import Field

from emporio.tools import Ferramentas

mcp = MCPServer(
    name="emporio-da-musica",
    title="Empório da Música",
    instructions=(
        "Dados da Empório da Música, loja de instrumentos em Campo Grande/MS. Preços e estoque vêm do "
        "catálogo; regras (trocas, frete, pagamento) vêm do manual — cite a seção devolvida."
    ),
)


@cache
def ferramentas() -> Ferramentas:
    return Ferramentas()


@mcp.tool(title="Buscar produtos")
def buscar_produtos(
    busca: Annotated[str | None, Field(description="Modelo, marca ou estilo (ex.: 'Yamaha', '7 cordas')")] = None,
    categoria: Annotated[str | None, Field(description="violões, guitarras, baixos, ukuleles…")] = None,
    preco_min: Annotated[float | None, Field(description="Preço mínimo em R$ (com promoção)")] = None,
    preco_max: Annotated[float | None, Field(description="Preço máximo em R$ (com promoção)")] = None,
    tipo_corda: Literal["aço", "nylon"] | None = None,
    apenas_disponiveis: bool = False,
    limite: Annotated[int, Field(ge=1, le=12)] = 6,
) -> dict:
    """Busca instrumentos no catálogo com preço, estoque, status, ficha técnica e promoção ativa."""
    return ferramentas().buscar_produtos(busca, categoria, preco_min, preco_max, tipo_corda, apenas_disponiveis, limite)


@mcp.tool(title="Promoções")
def buscar_promocoes(
    busca: Annotated[str | None, Field(description="Produto específico (traz também campanhas encerradas)")] = None,
) -> dict:
    """Promoções ativas; com `busca`, inclui as campanhas já encerradas daquele produto."""
    return ferramentas().buscar_promocoes(busca)


@mcp.tool(title="Calcular pagamento")
def calcular_pagamento(produto_id: int, quantidade: Annotated[int, Field(ge=1)] = 1) -> dict:
    """Preço final, preço no Pix e parcelas permitidas pelo manual (seções 3, 3.1 e 6.2)."""
    return ferramentas().calcular_pagamento(produto_id, quantidade)


@mcp.tool(title="Consultar o manual")
def consultar_politicas(pergunta: str) -> dict:
    """Seções do manual de políticas mais relevantes para a pergunta, com o texto original."""
    return ferramentas().consultar_politicas(pergunta)


@mcp.tool(title="Status da loja")
def status_loja() -> dict:
    """Se a loja está aberta agora, próximos horários, endereço e contatos."""
    return ferramentas().status_loja()


@mcp.tool(title="Consultar pedido")
def consultar_pedido(
    pedido: str,
    contato: Annotated[str, Field(description="Telefone ou e-mail cadastrado do cliente")],
) -> dict:
    """Status, itens e prazos de troca de um pedido. Só responde se o contato bater com o do cliente
    e nunca devolve dados de contato."""
    return ferramentas().consultar_pedido(pedido, contato)


@mcp.resource("manual://secoes/{secao}", title="Seção do manual", mime_type="text/plain")
def secao_do_manual(secao: str) -> str:
    """Texto de uma seção do manual de políticas (ex.: 4.1)."""
    for s in ferramentas().store.policies:
        if s["id"] == secao:
            return f"{s['titulo']}\n\n{s['texto']}"
    raise ValueError(f"Seção {secao} não existe.")


if __name__ == "__main__":
    if "--http" in sys.argv:
        mcp.run("streamable-http", port=8001)
    else:
        mcp.run()
