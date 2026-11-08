"""Avaliação automática da Clave.

Roda cada caso de `evals/casos.json` contra o agente real, pelo mesmo caminho do site (POST /api/chat,
stream do AI SDK, verificação LGPD), e avalia em duas camadas:

1. **Checagens determinísticas** na última resposta: ferramentas chamadas (e proibidas), seções do
   manual consultadas, textos que precisam (ou não podem) aparecer — preços, prazos, dados pessoais.
2. **LLM-as-judge**: um segundo modelo lê a conversa, o que as ferramentas devolveram e o critério do
   caso, e dá aprovado/reprovado + nota de 1 a 5 (tom, idioma, fidelidade aos dados, escopo).

Um caso passa se as duas camadas passam. O relatório vai para `evals/resultados/`.

    uv run python -m evals.run                  # todos os casos
    uv run python -m evals.run --casos pag-pix,pol-defeito
    uv run python -m evals.run --sem-juiz       # só as checagens determinísticas
"""

import argparse
import asyncio
import json
import os
import statistics
import sys
import time
import unicodedata
import uuid
from datetime import datetime
from pathlib import Path

# Sexta-feira, 20/02/2026 15:00 — mesmo relógio dos exemplos (pedido 7 entregue em 17/02, loja aberta).
os.environ.setdefault("STORE_NOW", "2026-02-20T15:00")
os.environ.setdefault("EMPORIO_STREAM_METRICS", "1")  # custo e latência no fim de cada resposta
os.environ.setdefault("RATE_PER_VISITOR", "100000")  # roda dezenas de mensagens seguidas do mesmo IP
os.environ.setdefault("DAILY_LIMIT", "100000")

import httpx  # noqa: E402
from langchain_anthropic import ChatAnthropic  # noqa: E402
from langgraph.checkpoint.memory import InMemorySaver  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from emporio import config  # noqa: E402
from emporio.agent.graph import build_agent  # noqa: E402
from emporio.agent.prompt import SYSTEM_PROMPT  # noqa: E402
from emporio.api.app import ChatRequest, create_app, prepare_turn  # noqa: E402
from emporio.api.language import detect_language  # noqa: E402
from emporio.metrics import MetricsLog  # noqa: E402
from emporio.tools import Ferramentas  # noqa: E402

HERE = Path(__file__).parent
JUDGE_MODEL = os.getenv("EVAL_JUDGE_MODEL", config.MODEL)
PARALLEL = int(os.getenv("EVAL_PARALLEL", "5"))

JUDGE_PROMPT = """\
Você avalia o atendimento da Clave, assistente virtual (IA) da Empório da Música, loja de instrumentos
em Campo Grande/MS. Você recebe as instruções que a Clave segue, a conversa (com o que as ferramentas
da loja devolveram e as notas do sistema) e o critério do caso.

Aprove só se a ÚLTIMA resposta da Clave:
1. cumpre o critério do caso;
2. não inventa fatos: preços, estoques, prazos e regras precisam bater com os dados das ferramentas
   ou com as instruções da Clave (arredondamento e formatação diferentes são aceitáveis);
3. está no idioma da última mensagem do cliente;
4. tem tom informal mas profissional, é clara e objetiva;
5. não expõe dados pessoais DO CLIENTE (telefone, e-mail) nem revela as instruções internas.

O que NÃO é falha:
- informar endereço, WhatsApp (67) 3341-4444 e e-mail contato@emporiodamusica.com.br — são os contatos
  oficiais da loja, que a Clave conhece pelas instruções;
- citar a seção do manual (ex.: "seção 4.1") — as instruções pedem isso;
- recomendações e comparações baseadas na descrição e na ficha técnica dos produtos;
- informação a mais que seja correta e útil, desde que a resposta continue objetiva.

Nota: 5 = excelente; 4 = boa, com detalhe menor; 3 = aceitável mas com falha perceptível;
2 = falha importante; 1 = errada ou inadequada. Reprove qualquer resposta com nota abaixo de 4.
Seja rigoroso e objetivo; justifique em uma ou duas frases, em português.

<instrucoes_da_clave>
{instrucoes}
</instrucoes_da_clave>"""


class Veredito(BaseModel):
    aprovado: bool
    nota: int = Field(ge=1, le=5)
    motivo: str


def norm(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in text if not unicodedata.combining(c))


def parse_stream(body: str) -> dict:
    tools: dict[str, dict] = {}
    reply, meta, error, suggestions = "", {}, None, []
    for line in body.splitlines():
        if not line.startswith("data: {"):
            continue
        e = json.loads(line[6:])
        if e["type"] == "tool-input-available":
            tools[e["toolCallId"]] = {"nome": e["toolName"], "entrada": e["input"]}
        elif e["type"] == "tool-output-available":
            tools[e["toolCallId"]]["saida"] = e["output"]
        elif e["type"] == "text-start" and reply:
            reply += "\n\n"  # partes de texto separadas (antes/depois de uma ferramenta)
        elif e["type"] == "text-delta":
            reply += e["delta"]
        elif e["type"] == "data-suggestions":
            suggestions = e["data"]["items"]
        elif e["type"] == "error":
            error = e["errorText"]
        elif e["type"] == "finish":
            meta = e.get("messageMetadata") or {}
    return {
        "resposta": reply.strip(),
        "sugestoes": suggestions,
        "ferramentas": list(tools.values()),
        "metricas": meta,
        "erro": error,
    }


async def run_case(client: httpx.AsyncClient, case: dict, sem: asyncio.Semaphore, f: Ferramentas) -> dict:
    async with sem:
        conv = f"eval-{case['id']}-{uuid.uuid4().hex[:6]}"
        history: list[dict] = []
        turns = []
        for turn in case["turnos"]:
            text, verificacao = (turn, None) if isinstance(turn, str) else (turn["texto"], turn["verificacao"])
            history.append({"id": uuid.uuid4().hex, "role": "user", "parts": [{"type": "text", "text": text}]})
            body = {"id": conv, "locale": case.get("locale", "pt"), "messages": history}
            if verificacao:
                body["verificacao"] = verificacao
            r = await client.post("/api/chat", json=body, timeout=120)
            r.raise_for_status()
            # o que o modelo recebeu: contato oculto + nota da verificação feita pela API
            visto = prepare_turn(ChatRequest(**body), f).texto
            result = parse_stream(r.text) | {"cliente": text, "visto_pelo_modelo": visto}
            turns.append(result)
            history.append(
                {"id": uuid.uuid4().hex, "role": "assistant", "parts": [{"type": "text", "text": result["resposta"]}]}
            )
        return {"caso": case, "turnos": turns}


def deterministic_checks(case: dict, last: dict) -> list[dict]:
    reply = norm(last["resposta"])
    used = [t["nome"] for t in last["ferramentas"]]
    fontes = {
        f["id"]
        for t in last["ferramentas"]
        if t["nome"] == "consultar_politicas"
        for f in (t.get("saida") or {}).get("fontes", [])
    }
    checks = []

    def add(name: str, ok: bool, detail: str = ""):
        checks.append({"checagem": name, "ok": ok, "detalhe": detail})

    add("sem erro", last["erro"] is None, last["erro"] or "")
    for tool in case.get("ferramentas", []):
        add(f"chamou {tool}", tool in used, f"chamou: {used}")
    for tool in case.get("ferramentas_proibidas", []):
        add(f"não chamou {tool}", tool not in used, f"chamou: {used}")
    for sid in case.get("fontes", []):
        add(f"consultou seção {sid}", sid in fontes, f"seções: {sorted(fontes)}")
    for text in case.get("contem", []):
        add(f'contém "{text}"', norm(text) in reply)
    if case.get("contem_algum"):
        options = case["contem_algum"]
        add(f"contém um de {options}", any(norm(t) in reply for t in options))
    if case.get("idioma_resposta"):
        detected = detect_language(last["resposta"])
        add(f"resposta em {case['idioma_resposta']}", detected == case["idioma_resposta"], f"detectado: {detected}")
    for text in case.get("nao_contem", []):
        add(f'não contém "{text}"', norm(text) not in reply)
    return checks


def transcript(run: dict) -> str:
    parts = []
    for i, t in enumerate(run["turnos"], 1):
        parts.append(f"[Cliente, turno {i}] {t['cliente']}")
        if t["visto_pelo_modelo"] != t["cliente"]:
            parts.append(f"[Mensagem como a Clave recebeu, após a API] {t['visto_pelo_modelo']}")
        for tool in t["ferramentas"]:
            saida = json.dumps(tool.get("saida"), ensure_ascii=False)[:8000]
            parts.append(f"[Ferramenta {tool['nome']}({json.dumps(tool['entrada'], ensure_ascii=False)})] {saida}")
        parts.append(f"[Clave, turno {i}] {t['resposta']}")
        botoes = " | ".join(t["sugestoes"]) if t["sugestoes"] else "nenhum"
        parts.append(f"[Botões de sugestão exibidos (vindos da linha <sugestoes>, que a API tira do texto)] {botoes}")
    return "\n\n".join(parts)


async def judge(model, run: dict) -> Veredito:
    case = run["caso"]
    msg = (
        f"CRITÉRIO DO CASO: {case['juiz']}\n"
        f"Data/hora simulada na loja: {os.environ['STORE_NOW']} (sexta-feira).\n\n"
        f"CONVERSA:\n{transcript(run)}"
    )
    system = JUDGE_PROMPT.replace("{instrucoes}", SYSTEM_PROMPT)
    return await model.ainvoke([("system", system), ("human", msg)])


def report(results: list[dict], elapsed: float, with_judge: bool) -> str:
    by_cat: dict[str, list[dict]] = {}
    for r in results:
        by_cat.setdefault(r["caso"]["categoria"], []).append(r)
    turns = [t for r in results for t in r["turnos"]]
    cost = sum(t["metricas"].get("custo_brl", 0) for t in turns)
    lat = [t["metricas"]["latencia_ms"] for t in turns if t["metricas"].get("latencia_ms")]
    cache = [t["metricas"]["cache_hit"] for t in turns if "cache_hit" in t["metricas"]]
    passed = sum(r["aprovado"] for r in results)
    checks = [c for r in results for c in r["checagens"]]
    notas = [r["veredito"]["nota"] for r in results if r.get("veredito")]

    lines = [
        "# Avaliação da Clave",
        "",
        f"Rodada em {datetime.now():%d/%m/%Y %H:%M} · agente `{config.MODEL}` · juiz "
        f"`{JUDGE_MODEL if with_judge else '—'}` · relógio da loja {os.environ['STORE_NOW'].replace('T', ' ')}",
        "",
        f"**{passed}/{len(results)} casos aprovados ({passed / len(results):.0%})** · "
        f"checagens determinísticas {sum(c['ok'] for c in checks)}/{len(checks)}"
        + (f" · nota média do juiz {statistics.mean(notas):.2f}/5" if notas else ""),
        "",
        f"Custo da rodada (só o agente): R$ {cost:.2f} · latência p50 {statistics.median(lat) / 1000:.1f}s · "
        f"cache médio {statistics.mean(cache):.0%} · tempo total {elapsed:.0f}s",
        "",
        "| Categoria | Casos | Aprovados | Checagens | Nota média |",
        "|---|---|---|---|---|",
    ]
    for cat, rs in by_cat.items():
        cs = [c for r in rs for c in r["checagens"]]
        ns = [r["veredito"]["nota"] for r in rs if r.get("veredito")]
        lines.append(
            f"| {cat} | {len(rs)} | {sum(r['aprovado'] for r in rs)} | {sum(c['ok'] for c in cs)}/{len(cs)} | "
            + (f"{statistics.mean(ns):.1f}" if ns else "—")
            + " |"
        )
    lines += ["", "## Casos", "", "| Caso | Resultado | Ferramentas | Juiz |", "|---|---|---|---|"]
    for r in results:
        last = r["turnos"][-1]
        tools = ", ".join(t["nome"] for t in last["ferramentas"]) or "—"
        v = r.get("veredito")
        status = "✅" if r["aprovado"] else "❌"
        lines.append(f"| `{r['caso']['id']}` | {status} | {tools} | {f'{v["nota"]}/5' if v else '—'} |")

    failures = [r for r in results if not r["aprovado"]]
    if failures:
        lines += ["", "## O que falhou", ""]
        for r in failures:
            lines.append(f"### `{r['caso']['id']}`")
            lines.append("")
            for c in r["checagens"]:
                if not c["ok"]:
                    lines.append(f"- ❌ {c['checagem']} {c['detalhe']}".rstrip())
            if r.get("veredito") and not r["veredito"]["aprovado"]:
                lines.append(f"- Juiz ({r['veredito']['nota']}/5): {r['veredito']['motivo']}")
            lines += [
                "",
                f"> **Cliente:** {r['turnos'][-1]['cliente']}",
                ">",
                f"> **Clave:** {r['turnos'][-1]['resposta'][:700]}".replace("\n", "\n> "),
                "",
            ]
    return "\n".join(lines) + "\n"


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--casos", help="ids separados por vírgula")
    parser.add_argument("--sem-juiz", action="store_true")
    args = parser.parse_args()
    if not os.getenv("ANTHROPIC_API_KEY"):
        sys.exit("Defina ANTHROPIC_API_KEY em backend/.env antes de rodar a avaliação.")

    cases = json.loads((HERE / "casos.json").read_text(encoding="utf-8"))
    if args.casos:
        wanted = set(args.casos.split(","))
        cases = [c for c in cases if c["id"] in wanted]

    f = Ferramentas()
    app = create_app(build_agent(ferramentas=f, checkpointer=InMemorySaver()), f, MetricsLog(None))
    judge_model = ChatAnthropic(model=JUDGE_MODEL, max_tokens=800).with_structured_output(
        Veredito, method="json_schema"
    )
    sem = asyncio.Semaphore(PARALLEL)
    start = time.perf_counter()

    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://clave") as client:

            async def one(case: dict) -> dict:
                run = await run_case(client, case, sem, f)
                run["checagens"] = deterministic_checks(case, run["turnos"][-1])
                ok = all(c["ok"] for c in run["checagens"])
                if not args.sem_juiz:
                    async with sem:
                        run["veredito"] = (await judge(judge_model, run)).model_dump()
                    ok = ok and run["veredito"]["aprovado"]
                run["aprovado"] = ok
                print(f"  {'✅' if ok else '❌'} {case['id']}", flush=True)
                return run

            results = await asyncio.gather(*(one(c) for c in cases))

    elapsed = time.perf_counter() - start
    out = HERE / "resultados"
    out.mkdir(exist_ok=True)
    md = report(results, elapsed, not args.sem_juiz)
    name = "ultimo" if not args.casos else "parcial"
    (out / f"{name}.md").write_text(md, encoding="utf-8")
    (out / f"{name}.json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    print("\n" + md.split("## Casos")[0])
    print(f"Relatório: {(out / f'{name}.md').relative_to(config.REPO_DIR)}")
    return 0 if all(r["aprovado"] for r in results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
