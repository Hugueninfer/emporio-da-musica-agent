"""Publica o backend num Hugging Face Space (Docker).

O Space recebe só o necessário — backend, dados e o Dockerfile na raiz —, não o site nem os modelos 3D.

    python deploy/huggingface/publish.py SEU_USUARIO/clave-backend
    python deploy/huggingface/publish.py --local PASTA     # só monta o Space numa pasta (para testar)

O `git push` pede usuário e senha do Hugging Face: a senha é um token com permissão de escrita
(huggingface.co/settings/tokens). O token nunca é gravado no repositório.
"""

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent

# (origem no repositório, destino no Space)
FILES = [
    ("backend/Dockerfile", "Dockerfile"),
    ("deploy/huggingface/README.md", "README.md"),
    ("backend/pyproject.toml", "backend/pyproject.toml"),
    ("backend/uv.lock", "backend/uv.lock"),
    ("backend/.python-version", "backend/.python-version"),
]
DIRS = [("backend/src", "backend/src"), ("data", "data")]
IGNORE = shutil.ignore_patterns("__pycache__", "*.pyc", "desafio_tecnico_ai_eng_artefact.pdf")


def run(*cmd: str, cwd: Path) -> None:
    print("$", " ".join(cmd))
    subprocess.run(cmd, cwd=cwd, check=True)


def assemble(out: Path) -> None:
    """Monta o Space: o Docker usa a raiz como contexto, igual ao repositório (COPY backend/…, COPY data)."""
    for src, dst in FILES:
        (out / dst).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(REPO / src, out / dst)
    for src, dst in DIRS:
        shutil.copytree(REPO / src, out / dst, ignore=IGNORE)
    (out / ".gitattributes").write_text("*.pdf binary\n", encoding="utf-8")


def main() -> None:
    if len(sys.argv) == 3 and sys.argv[1] == "--local":
        assemble(Path(sys.argv[2]))
        print(f"Space montado em {sys.argv[2]}")
        return
    if len(sys.argv) != 2 or "/" not in sys.argv[1]:
        sys.exit("Uso: python deploy/huggingface/publish.py USUARIO/NOME-DO-SPACE")
    space = sys.argv[1]
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp)
        assemble(out)

        commit = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"], cwd=REPO, capture_output=True, text=True
        ).stdout.strip()
        run("git", "init", "-q", "-b", "main", cwd=out)
        run("git", "add", "-A", cwd=out)
        run("git", "-c", "user.name=deploy", "-c", "user.email=deploy@localhost", "commit", "-q",
            "-m", f"Backend da Clave (repositório em {commit})", cwd=out)
        run("git", "push", "--force", f"https://huggingface.co/spaces/{space}", "main", cwd=out)
    print(f"\nPublicado. Acompanhe o build em https://huggingface.co/spaces/{space}")
    user, name = space.split("/")
    print(f"Endereço da API: https://{user}-{name}.hf.space".lower())


if __name__ == "__main__":
    main()
