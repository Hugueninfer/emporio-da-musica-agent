"""Custo, tokens e latência de cada resposta da Clave.

Cada turno vira uma linha em `var/metrics.jsonl` e no log; `GET /metrics` agrega (latência p50/p95,
custo total e por resposta, quanto do prompt veio do cache, tempo de cada ferramenta).
"""

import json
import os
import statistics
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path

# US$ por milhão de tokens (entrada, saída), por família de modelo. Valores de referência da tabela
# pública da Anthropic; confira em https://www.anthropic.com/pricing e ajuste se mudar.
PRICES_USD_PER_MTOK = {"haiku": (1.0, 5.0), "sonnet": (3.0, 15.0), "opus": (5.0, 25.0)}
CACHE_READ_FACTOR = 0.10  # leitura do cache custa 10% da entrada
CACHE_WRITE_FACTOR = 1.25  # gravar no cache custa 125% da entrada (TTL de 5 min)


def usd_brl() -> float:
    """Cotação usada para mostrar o custo em reais (ajustável no .env)."""
    return float(os.getenv("USD_BRL", "5.50"))


def prices(model: str) -> tuple[float, float]:
    for family, price in PRICES_USD_PER_MTOK.items():
        if family in model:
            return price
    return PRICES_USD_PER_MTOK["sonnet"]


@dataclass
class TurnMetrics:
    model: str
    thread_id: str = ""
    started: float = field(default_factory=time.perf_counter)
    first_token_ms: float | None = None
    model_calls: int = 0
    input_tokens: int = 0  # sem cache
    cache_read_tokens: int = 0
    cache_write_tokens: int = 0
    output_tokens: int = 0
    tools: list[dict] = field(default_factory=list)
    error: bool = False
    _open_tools: dict[str, tuple[str, float]] = field(default_factory=dict)

    def first_token(self) -> None:
        if self.first_token_ms is None:
            self.first_token_ms = self._elapsed_ms()

    def add_usage(self, usage: dict | None) -> None:
        """`usage_metadata` do LangChain: `input_tokens` já inclui os tokens lidos/gravados no cache."""
        self.model_calls += 1
        if not usage:
            return
        details = usage.get("input_token_details") or {}
        read, write = details.get("cache_read") or 0, details.get("cache_creation") or 0
        self.cache_read_tokens += read
        self.cache_write_tokens += write
        self.input_tokens += max(0, usage.get("input_tokens", 0) - read - write)
        self.output_tokens += usage.get("output_tokens", 0)

    def tool_started(self, call_id: str, name: str) -> None:
        self._open_tools[call_id] = (name, time.perf_counter())

    def tool_finished(self, call_id: str) -> None:
        if call_id in self._open_tools:
            name, start = self._open_tools.pop(call_id)
            self.tools.append({"nome": name, "ms": round((time.perf_counter() - start) * 1000)})

    @property
    def cost_usd(self) -> float:
        price_in, price_out = prices(self.model)
        return (
            self.input_tokens * price_in
            + self.cache_read_tokens * price_in * CACHE_READ_FACTOR
            + self.cache_write_tokens * price_in * CACHE_WRITE_FACTOR
            + self.output_tokens * price_out
        ) / 1_000_000

    @property
    def cache_hit(self) -> float:
        """Fração do prompt que veio do cache."""
        total = self.input_tokens + self.cache_read_tokens + self.cache_write_tokens
        return self.cache_read_tokens / total if total else 0.0

    def _elapsed_ms(self) -> float:
        return round((time.perf_counter() - self.started) * 1000)

    def summary(self) -> dict:
        return {
            "conversa": self.thread_id,
            "modelo": self.model,
            "ts": time.time(),
            "latencia_ms": self._elapsed_ms(),
            "primeiro_token_ms": self.first_token_ms,
            "chamadas_modelo": self.model_calls,
            "tokens": {
                "entrada": self.input_tokens,
                "cache_leitura": self.cache_read_tokens,
                "cache_escrita": self.cache_write_tokens,
                "saida": self.output_tokens,
            },
            "cache_hit": round(self.cache_hit, 3),
            "custo_usd": round(self.cost_usd, 6),
            "custo_brl": round(self.cost_usd * usd_brl(), 4),
            "ferramentas": self.tools,
            "erro": self.error,
        }


def _percentile(values: list[float], p: float) -> float | None:
    if not values:
        return None
    if len(values) == 1:
        return values[0]
    return round(statistics.quantiles(values, n=100, method="inclusive")[int(p) - 1])


class MetricsLog:
    """Guarda os turnos em JSONL e mantém os últimos em memória para o `/metrics`."""

    def __init__(self, path: Path | None = None, keep: int = 2000):
        self.path = path
        self.turns: deque[dict] = deque(maxlen=keep)
        self._lock = threading.Lock()
        if path and path.exists():
            for line in path.read_text(encoding="utf-8").splitlines()[-keep:]:
                if line.strip():
                    self.turns.append(json.loads(line))

    def record(self, turn: dict) -> None:
        with self._lock:
            self.turns.append(turn)
            if self.path:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                with self.path.open("a", encoding="utf-8") as f:
                    f.write(json.dumps(turn, ensure_ascii=False) + "\n")

    def report(self) -> dict:
        turns = list(self.turns)
        if not turns:
            return {"respostas": 0}
        latencies = [t["latencia_ms"] for t in turns]
        first = [t["primeiro_token_ms"] for t in turns if t["primeiro_token_ms"] is not None]
        tokens = {k: sum(t["tokens"][k] for t in turns) for k in turns[0]["tokens"]}
        prompt = tokens["entrada"] + tokens["cache_leitura"] + tokens["cache_escrita"]
        cost = sum(t["custo_usd"] for t in turns)
        by_tool: dict[str, list[int]] = {}
        for t in turns:
            for tool in t["ferramentas"]:
                by_tool.setdefault(tool["nome"], []).append(tool["ms"])
        return {
            "respostas": len(turns),
            "conversas": len({t["conversa"] for t in turns}),
            "erros": sum(1 for t in turns if t["erro"]),
            "latencia_ms": {"p50": _percentile(latencies, 50), "p95": _percentile(latencies, 95)},
            "primeiro_token_ms": {"p50": _percentile(first, 50), "p95": _percentile(first, 95)},
            "tokens": tokens,
            "cache_hit": round(tokens["cache_leitura"] / prompt, 3) if prompt else 0.0,
            "custo": {
                "total_usd": round(cost, 4),
                "total_brl": round(cost * usd_brl(), 2),
                "por_resposta_brl": round(cost * usd_brl() / len(turns), 4),
            },
            "ferramentas": {
                name: {"chamadas": len(ms), "p50_ms": _percentile(ms, 50)} for name, ms in sorted(by_tool.items())
            },
        }
