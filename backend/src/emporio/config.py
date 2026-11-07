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

TZ = ZoneInfo("America/Campo_Grande")
MODEL = os.getenv("EMPORIO_MODEL", "claude-sonnet-5-5")


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
