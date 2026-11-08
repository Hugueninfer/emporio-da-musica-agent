"""Limites de uso para a API pública (a chave da Anthropic paga cada mensagem).

Em memória: a demo roda numa instância só. Com várias instâncias, isso iria para o Redis.
"""

import time
from collections import defaultdict, deque
from datetime import date


class SlidingWindow:
    """Quantas vezes cada chave (IP) usou algo na janela de tempo."""

    def __init__(self, window_seconds: float):
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def _recent(self, key: str) -> deque[float]:
        q = self._hits[key]
        while q and time.monotonic() - q[0] > self.window:
            q.popleft()
        return q

    def blocked(self, key: str, max_hits: int) -> bool:
        return len(self._recent(key)) >= max_hits

    def hit(self, key: str) -> None:
        self._recent(key).append(time.monotonic())


class DailyCounter:
    """Total de mensagens do dia, para o teto global de custo."""

    def __init__(self) -> None:
        self.day = date.today()
        self.count = 0

    def blocked(self, limit: int) -> bool:
        if date.today() != self.day:
            self.day, self.count = date.today(), 0
        return self.count >= limit

    def hit(self) -> None:
        self.count += 1


MESSAGES = {
    "visitante": {
        "pt": "Recebi muitas mensagens suas em pouco tempo. Me dá uns minutinhos e tenta de novo? Se for "
        "urgente, a equipe atende no WhatsApp (67) 3341-4444.",
        "en": "I've received a lot of messages from you in a short time. Give me a few minutes and try "
        "again? If it's urgent, our team is on WhatsApp +55 67 3341-4444.",
    },
    "diario": {
        "pt": "Esta demonstração atingiu o limite de conversas de hoje. Volte amanhã, ou fale com a equipe "
        "pelo WhatsApp (67) 3341-4444.",
        "en": "This demo has reached today's conversation limit. Please come back tomorrow, or talk to our "
        "team on WhatsApp +55 67 3341-4444.",
    },
    "longa": {
        "pt": "Essa mensagem ficou longa demais pra mim (limite de {max} caracteres). Pode resumir?",
        "en": "That message is too long for me (the limit is {max} characters). Could you shorten it?",
    },
}
