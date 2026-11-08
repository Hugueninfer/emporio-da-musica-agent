# Backend da Clave (API + agente). Contexto de build: raiz do repositório (precisa de data/).
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.13 /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1 \
    EMPORIO_DATA_DIR=/app/data \
    EMPORIO_VAR_DIR=/app/var

WORKDIR /app/backend

# Dependências primeiro (camada em cache enquanto o lock não muda)
COPY backend/pyproject.toml backend/uv.lock backend/.python-version ./
RUN uv sync --locked --no-dev --no-install-project

COPY backend/src ./src
COPY data /app/data
RUN uv sync --locked --no-dev && uv run --no-sync python -m emporio.data.build

EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uv", "run", "--no-sync", "uvicorn", "emporio.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
