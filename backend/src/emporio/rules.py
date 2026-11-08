"""Regras do manual de políticas, em código e testadas.

O modelo nunca faz conta: preço com desconto, parcelas, prazos de troca e horário saem daqui.
Cada função cita a seção do manual que implementa.
"""

from datetime import date, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal

WEEKDAYS = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]

# 2. Horário de Funcionamento: seg–sex 09–18, sábado 09–13, domingo e feriados fechado.
HOURS: dict[int, tuple[time, time]] = {d: (time(9), time(18)) for d in range(5)} | {5: (time(9), time(13))}

# Feriados nacionais, estadual (MS) e municipal (Campo Grande). O manual diz só "feriados".
FIXED_HOLIDAYS = {
    (1, 1): "Confraternização Universal",
    (4, 21): "Tiradentes",
    (5, 1): "Dia do Trabalho",
    (8, 26): "Aniversário de Campo Grande",
    (9, 7): "Independência do Brasil",
    (10, 11): "Criação do Estado de Mato Grosso do Sul",
    (10, 12): "Nossa Senhora Aparecida",
    (11, 2): "Finados",
    (11, 15): "Proclamação da República",
    (11, 20): "Dia da Consciência Negra",
    (12, 25): "Natal",
}

PIX_DISCOUNT = Decimal("0.05")
RETURN_DAYS = 7  # 4.1 arrependimento: dias corridos após o recebimento
DEFECT_DAYS = 30  # 4.2 defeito: dias corridos após a compra
LEGAL_WARRANTY_DAYS = 90  # 8.1 garantia legal: a partir do recebimento


def money(value: float | Decimal) -> float:
    """Arredonda para centavos (meio para cima), como no caixa."""
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def min_installment(n: int) -> int:
    """3.1: até 3x ≥ R$ 50; de 4x a 6x ≥ R$ 80; de 7x a 12x ≥ R$ 100."""
    if n <= 3:
        return 50
    if n <= 6:
        return 80
    return 100


def installment_options(total: float) -> list[dict]:
    """3 e 3.1: crédito em até 12x sem juros, respeitando a parcela mínima de cada faixa."""
    options = [{"parcelas": 1, "valor": money(total)}]
    for n in range(2, 13):
        value = money(Decimal(str(total)) / n)
        if value >= min_installment(n):
            options.append({"parcelas": n, "valor": value})
    return options


def promo_price(price: float, percent: int) -> float:
    return money(Decimal(str(price)) * (100 - percent) / 100)


def pix_price(price: float, has_promo: bool) -> float | None:
    """3: Pix tem 5% sobre o preço de tabela. 6.2: não se aplica sobre preço promocional."""
    if has_promo:
        return None
    return money(Decimal(str(price)) * (1 - PIX_DISCOUNT))


def return_deadlines(order_date: date, delivered_on: date | None, today: date) -> dict:
    """4.1, 4.2 e 8.1. `delivered_on` é None enquanto o pedido não chegou."""

    def until(start: date | None, days: int) -> tuple[str | None, bool | None]:
        if start is None:
            return None, None
        end = start + timedelta(days=days)
        return end.isoformat(), today <= end

    arrependimento_ate, arrependimento_ok = until(delivered_on, RETURN_DAYS)
    defeito_ate, defeito_ok = until(order_date, DEFECT_DAYS)
    garantia_ate, _ = until(delivered_on, LEGAL_WARRANTY_DAYS)
    return {
        "hoje": today.isoformat(),
        "arrependimento_ate": arrependimento_ate,
        "arrependimento_no_prazo": arrependimento_ok,
        "defeito_ate": defeito_ate,
        "defeito_no_prazo": defeito_ok,
        "garantia_legal_ate": garantia_ate,
    }


def _easter(year: int) -> date:
    """Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher)."""
    a, b, c = year % 19, year // 100, year % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    m = (32 + 2 * e + 2 * i - h - k) % 7
    n = (a + 11 * h + 22 * m) // 451
    month = (h + m - 7 * n + 114) // 31
    day = (h + m - 7 * n + 114) % 31 + 1
    return date(year, month, day)


def holiday(day: date) -> str | None:
    if day == _easter(day.year) - timedelta(days=2):
        return "Sexta-feira Santa"
    return FIXED_HOLIDAYS.get((day.month, day.day))


def _hours(day: date) -> tuple[time, time] | None:
    if holiday(day):
        return None
    return HOURS.get(day.weekday())


def store_status(now: datetime) -> dict:
    """Se a loja está aberta agora e, se não, quando abre (2. Horário de Funcionamento)."""
    today = now.date()
    status: dict = {
        "agora": f"{WEEKDAYS[today.weekday()]}, {now:%d/%m/%Y %H:%M}",
        "aberta": False,
        "feriado": holiday(today),
    }
    hours = _hours(today)
    if hours and hours[0] <= now.time() < hours[1]:
        status["aberta"] = True
        status["fecha_as"] = f"{hours[1]:%H:%M}"
        return status

    day = today if hours and now.time() < hours[0] else today + timedelta(days=1)
    while _hours(day) is None:
        day += timedelta(days=1)
    delta = (day - today).days
    quando = {0: "hoje", 1: "amanhã"}.get(delta, WEEKDAYS[day.weekday()])
    status["abre"] = {
        "data": day.isoformat(),
        "dia": WEEKDAYS[day.weekday()],
        "quando": quando,
        "hora": f"{_hours(day)[0]:%H:%M}",
    }
    return status
