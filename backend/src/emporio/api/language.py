"""Idioma da mensagem do cliente (português ou inglês), por palavras muito comuns em cada um.

Simples de propósito: a loja atende os dois idiomas e só precisa decidir entre eles. Quando não dá para
saber ("oi", "#8", "ok"), devolve None e vale o idioma da página.
"""

import re

PT = set(
    "o a os as um uma de do da dos das que para pra com não nao é e vocês voces você voce tem têm qual quais "
    "quanto quero queria meu minha meus no na nos nas por favor obrigado obrigada oi olá ola tudo bem como "
    "onde quando posso pode loja preço preco violão violao comprar está esta estão estao agora aberto abertos "
    "aberta ainda também tambem mais muito isso aqui vai foi sim ser ter vc vcs pq tb tbm fala falar falam "
    "português portugues portuges ajuda ajudar mostra mostrar me quanto custa barato barata instrumento "
    "procurando preciso gostaria gosto ukulele guitarra teclado bateria baixo".split()
)
EN = set(
    "the a an of to and is are do does you your have has what which how much many i i'm my me want would "
    "like can could please thanks thank hi hello there where when store price guitar buy any under with "
    "for it this that what's it's don't i'd we're open now right return policy help find show need looking "
    "instrument instruments know tell cost cheap cheapest best recommend speak english hey yes no thanks "
    "ukuleles guitars drums keyboard keyboards bass deals".split()
)


def detect_language(text: str) -> str | None:
    words = re.findall(r"[a-zà-ú']+", text.lower())
    pt = sum(w in PT for w in words)
    en = sum(w in EN for w in words)
    if max(pt, en) < 2 or pt == en:
        return None
    return "pt" if pt > en else "en"
