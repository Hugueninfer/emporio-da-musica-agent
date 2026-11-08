"""Ferramentas do `emporio.tools` expostas ao modelo como tools do LangChain.

`consultar_pedido` aqui é diferente da função pura: o modelo só informa o número. Os dados do pedido
só saem se a API já tiver verificado o contato nesta conversa (`pedidos_verificados` no estado),
assim o telefone/e-mail do cliente nunca passa pelo modelo.
"""

from typing import Annotated, Literal

from langchain_core.tools import BaseTool, StructuredTool
from langgraph.prebuilt import InjectedState
from pydantic import BaseModel, Field

from emporio.tools import Ferramentas


class BuscarProdutos(BaseModel):
    busca: str | None = Field(None, description="Palavras-chave: modelo, marca, estilo (ex.: 'Yamaha', '7 cordas').")
    categoria: str | None = Field(
        None, description="Categoria: violões, guitarras, baixos, baterias, teclados, ukuleles, sopros…"
    )
    preco_min: float | None = Field(None, description="Preço mínimo em reais (já considera promoção).")
    preco_max: float | None = Field(None, description="Preço máximo em reais (já considera promoção).")
    tipo_corda: Literal["aço", "nylon"] | None = Field(None, description="Só violões e ukuleles.")
    apenas_disponiveis: bool = Field(False, description="True para só itens ativos e com estoque.")
    limite: int = Field(6, ge=1, le=12, description="Quantos produtos mostrar.")


class BuscarPromocoes(BaseModel):
    busca: str | None = Field(
        None, description="Produto específico; também traz campanhas já encerradas dele (para checar se ainda vale)."
    )


class CalcularPagamento(BaseModel):
    produto_id: int = Field(description="`id` do produto, vindo de buscar_produtos.")
    quantidade: int = Field(1, ge=1)


class ConsultarPoliticas(BaseModel):
    pergunta: str = Field(description="A dúvida do cliente, de preferência em português.")


class ConsultarPedido(BaseModel):
    pedido: str = Field(description="Número do pedido já verificado.")
    state: Annotated[dict, InjectedState]


class SemArgumentos(BaseModel):
    pass


def build_tools(f: Ferramentas) -> list[BaseTool]:
    def consultar_pedido(pedido: str, state: dict) -> dict:
        numero = "".join(c for c in str(pedido) if c.isdigit())
        tentativas = state.get("verificacoes") or {}
        if not numero or tentativas.get(numero) is None:
            return {"verificado": False, "motivo": "verificacao_necessaria"}
        return tentativas[numero]

    return [
        StructuredTool.from_function(
            f.buscar_produtos,
            name="buscar_produtos",
            description="Busca instrumentos no catálogo: preço, estoque, status, ficha técnica e promoção ativa.",
            args_schema=BuscarProdutos,
        ),
        StructuredTool.from_function(
            f.buscar_promocoes,
            name="buscar_promocoes",
            description="Lista as promoções ativas. Com `busca`, mostra também campanhas encerradas daquele produto.",
            args_schema=BuscarPromocoes,
        ),
        StructuredTool.from_function(
            f.calcular_pagamento,
            name="calcular_pagamento",
            description="Preço final, preço no Pix e opções de parcelamento permitidas pelo manual para um produto.",
            args_schema=CalcularPagamento,
        ),
        StructuredTool.from_function(
            f.consultar_politicas,
            name="consultar_politicas",
            description="Busca as seções do manual de políticas (trocas, garantia, frete, pagamento, contato, LGPD…).",
            args_schema=ConsultarPoliticas,
        ),
        StructuredTool.from_function(
            f.status_loja,
            name="status_loja",
            description="Se a loja está aberta agora, quando abre ou fecha, horários, endereço e contatos.",
            args_schema=SemArgumentos,
        ),
        StructuredTool.from_function(
            f.solicitar_verificacao,
            name="solicitar_verificacao",
            description="Abre para o cliente o formulário seguro de número do pedido + telefone/e-mail.",
            args_schema=SemArgumentos,
        ),
        StructuredTool.from_function(
            consultar_pedido,
            name="consultar_pedido",
            description="Status, itens, rastreio e prazos de troca de um pedido cuja verificação já foi aprovada.",
            args_schema=ConsultarPedido,
        ),
    ]
