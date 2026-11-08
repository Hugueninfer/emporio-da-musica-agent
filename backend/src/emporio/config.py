"""Caminhos e configurações lidos do ambiente (.env)."""

import os
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_DIR = BACKEND_DIR.parent

load_dotenv(BACKEND_DIR / ".env")

DATA_DIR = Path(os.getenv("EMPORIO_DATA_DIR", REPO_DIR / "data"))
VAR_DIR = Path(os.getenv("EMPORIO_VAR_DIR", BACKEND_DIR / "var"))
DB_PATH = VAR_DIR / "store.db"
POLICIES_PATH = VAR_DIR / "policies.json"
CHECKPOINTS_PATH = VAR_DIR / "conversas.sqlite3"
METRICS_PATH = VAR_DIR / "metrics.jsonl"

TZ = ZoneInfo("America/Campo_Grande")
MODEL = os.getenv("EMPORIO_MODEL", "claude-sonnet-5-5")
# Métricas (custo, tokens) no `messageMetadata` do stream: só para a avaliação e os exemplos — o
# navegador do cliente não precisa ver quanto cada resposta custa.
STREAM_METRICS = os.getenv("EMPORIO_STREAM_METRICS") == "1"

# Limites da API pública (cada mensagem custa tokens da chave da Anthropic)
RATE_PER_VISITOR = int(os.getenv("RATE_PER_VISITOR", "30"))  # mensagens por visitante a cada 10 min
DAILY_LIMIT = int(os.getenv("DAILY_LIMIT", "500"))  # mensagens por dia, somando todos
MAX_MESSAGE_CHARS = int(os.getenv("MAX_MESSAGE_CHARS", "2000"))
METRICS_TOKEN = os.getenv("METRICS_TOKEN") or None  # se definido, /metrics?token=… é exigido


def now() -> datetime:
    """Agora no fuso da loja. `STORE_NOW` (ISO) fixa o relógio — útil nos exemplos e testes."""
    fixed = os.getenv("STORE_NOW")
    if fixed:
        dt = datetime.fromisoformat(fixed)
        return dt if dt.tzinfo else dt.replace(tzinfo=TZ)
    return datetime.now(TZ)


def today() -> date:
    """Data de "hoje" para prazos. `STORE_TODAY` (AAAA-MM-DD) tem prioridade sobre `STORE_NOW`."""
    fixed = os.getenv("STORE_TODAY")
    return date.fromisoformat(fixed) if fixed else now().date()
