"""LGPD: o telefone e o e-mail do cliente nunca chegam ao modelo nem ficam salvos na conversa.

Se o cliente digitar os dados no chat em vez de usar o formulário, a API faz a verificação com eles
antes de apagá-los do texto.
"""

import re
import time
from collections import defaultdict, deque

EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
# Com DDD: (67) 99654-7821 · 67 99654 7821 · +55 67 996547821 · 67996547821
# Sem DDD: 99654-7821 · 3341-4444 · 996547821 — sem espaço no meio, senão "2025 1500" vira telefone.
PHONE = re.compile(r"(?<![\w#])(?:(?:\+?55\s*)?\(?\d{2}\)?[\s.-]*\d{4,5}[\s.-]?\d{4}|\d{4,5}[.-]?\d{4})(?!\d)")
# "pedido 8", "pedido #8", "pedido nº 8", "meu pedido é o 18", "my order number is #15", "#7"
ORDER = re.compile(
    r"(?:\b(?:pedido|order|compra)\b(?:\s+(?:é|e|eh|o|a|do|da|de|n[ºo°.]?|número|numero|number|is|nr))*\s*[:#]?\s*|#\s*)"
    r"(\d{1,6})\b",
    re.IGNORECASE,
)

HIDDEN = "[contato oculto]"


def redact(text: str) -> str:
    return PHONE.sub(HIDDEN, EMAIL.sub(HIDDEN, text))


def find_contact(text: str) -> str | None:
    if m := EMAIL.search(text):
        return m.group(0)
    if m := PHONE.search(text):
        return m.group(0)
    return None


def find_verification(text: str) -> dict | None:
    """Número do pedido + contato digitados na mesma mensagem, ou None."""
    contact = find_contact(text)
    if not contact:
        return None
    order = ORDER.search(text.replace(contact, " "))
    return {"pedido": order.group(1), "contato": contact} if order else None


class AttemptLimiter:
    """Limita verificações de pedido que falham por origem (IP), para ninguém testar números de pedido e
    contatos em sequência. Só falhas contam; uma verificação certa não gasta tentativa."""

    def __init__(self, max_failures: int = 5, window_seconds: float = 15 * 60):
        self.max_failures = max_failures
        self.window = window_seconds
        self._failures: dict[str, deque[float]] = defaultdict(deque)

    def _recent(self, key: str) -> deque[float]:
        q = self._failures[key]
        while q and time.monotonic() - q[0] > self.window:
            q.popleft()
        return q

    def blocked(self, key: str) -> bool:
        return len(self._recent(key)) >= self.max_failures

    def failed(self, key: str) -> None:
        self._recent(key).append(time.monotonic())
