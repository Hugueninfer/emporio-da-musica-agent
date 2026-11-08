"""LGPD: o telefone e o e-mail do cliente nunca chegam ao modelo nem ficam salvos na conversa.

Se o cliente digitar os dados no chat em vez de usar o formulário, a API faz a verificação com eles
antes de apagá-los do texto.
"""

import re

EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
# (67) 99654-7821 · 67 99654 7821 · +55 67 996547821 · 99654-7821 · 3341-4444
PHONE = re.compile(r"(?<![\w#])(?:\+?55\s*)?(?:\(?\d{2}\)?[\s.-]*)?\d{4,5}[\s.-]?\d{4}(?!\d)")
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
