# Backend da Clave (API + agente). Contexto de build: raiz do repositório (precisa de data/).
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.13 /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1 \
    EMPORIO_DATA_DIR=/app/data \
    EMPORIO_VAR_DIR=/app/var \
    PATH="/app/backend/.venv/bin:$PATH"

WORKDIR /app/backend

# Dependências primeiro (camada em cache enquanto o lock não muda)
COPY backend/pyproject.toml backend/uv.lock backend/.python-version ./
RUN uv sync --locked --no-dev --no-install-project

COPY backend/src ./src
COPY data /app/data
RUN uv sync --locked --no-dev && python -m emporio.data.build \
    # Alguns provedores (Hugging Face Spaces) rodam o container como usuário 1000, não root:
    # a pasta das conversas e métricas precisa ser gravável por ele.
    && chown -R 1000:1000 /app/var

USER 1000
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://localhost:%s/health' % os.getenv('PORT', '8000'))"

# PORT vem do provedor; --proxy-headers faz o IP real do visitante valer para os limites de uso
CMD ["sh", "-c", "uvicorn emporio.api.app:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
