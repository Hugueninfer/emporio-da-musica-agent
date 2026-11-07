// Horário de funcionamento (políticas da loja, seção 2), sempre no fuso de Campo Grande.
export const STORE_TZ = "America/Campo_Grande";

/** Horário por dia da semana (0 = domingo). null = fechado. */
export const WEEK_HOURS: Record<number, { open: number; close: number } | null> = {
  0: null,
  1: { open: 9, close: 18 },
  2: { open: 9, close: 18 },
  3: { open: 9, close: 18 },
  4: { open: 9, close: 18 },
  5: { open: 9, close: 18 },
  6: { open: 9, close: 13 },
};

/**
 * Feriados em que a loja fecha (nacionais + Campo Grande/MS). Lista configurável:
 * ajustar a cada ano ou trocar por uma fonte do backend.
 */
export const HOLIDAYS = new Set<string>([
  // 2026
  "2026-01-01", "2026-02-16", "2026-02-17", "2026-04-03", "2026-04-21", "2026-05-01",
  "2026-06-04", "2026-08-26", "2026-09-07", "2026-10-11", "2026-10-12", "2026-11-02",
  "2026-11-15", "2026-11-20", "2026-12-25",
  // 2027
  "2027-01-01", "2027-02-08", "2027-02-09", "2027-03-26", "2027-04-21", "2027-05-01",
  "2027-05-27", "2027-08-26", "2027-09-07", "2027-10-11", "2027-10-12", "2027-11-02",
  "2027-11-15", "2027-11-20", "2027-12-25",
]);

export interface StoreStatus {
  open: boolean;
  /** Aberta: hora em que fecha hoje. */
  closesAt?: number;
  /** Fechada: quando abre de novo. */
  opens?: { when: "today" | "tomorrow" | "weekday"; weekday: number; hour: number };
  /** Linha da tabela de horários que vale hoje (0 = seg–sex, 1 = sábado, 2 = domingo/feriado). */
  todayRow: number;
}

interface ZonedNow {
  ymd: string;
  weekday: number;
  minutes: number;
}

function zonedNow(now: Date): ZonedNow {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: STORE_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const ymd = `${parts.year}-${parts.month}-${parts.day}`;
  const weekday = new Date(`${ymd}T12:00:00Z`).getUTCDay();
  return { ymd, weekday, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

function addDays(ymd: string, days: number): { ymd: string; weekday: number } {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return { ymd: d.toISOString().slice(0, 10), weekday: d.getUTCDay() };
}

function hoursFor(ymd: string, weekday: number) {
  return HOLIDAYS.has(ymd) ? null : WEEK_HOURS[weekday];
}

export function getStoreStatus(now: Date = new Date()): StoreStatus {
  const { ymd, weekday, minutes } = zonedNow(now);
  const today = hoursFor(ymd, weekday);
  const todayRow = today === null ? 2 : weekday === 6 ? 1 : 0;

  if (today && minutes >= today.open * 60 && minutes < today.close * 60) {
    return { open: true, closesAt: today.close, todayRow };
  }
  if (today && minutes < today.open * 60) {
    return { open: false, opens: { when: "today", weekday, hour: today.open }, todayRow };
  }
  for (let i = 1; i <= 14; i++) {
    const next = addDays(ymd, i);
    const h = hoursFor(next.ymd, next.weekday);
    if (!h) continue;
    return { open: false, opens: { when: i === 1 ? "tomorrow" : "weekday", weekday: next.weekday, hour: h.open }, todayRow };
  }
  return { open: false, todayRow };
}
