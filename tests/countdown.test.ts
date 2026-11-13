import { test } from "node:test";
import assert from "node:assert/strict";
import { getTimeLeft } from "../lib/countdown.ts";

const target = new Date("2027-03-20T21:30:00-03:00").getTime();

test("descompone días/horas/minutos/segundos", () => {
  const now = target - ((3 * 86400 + 4 * 3600 + 5 * 60 + 6) * 1000);
  assert.deepEqual(
    { ...getTimeLeft(target, now), totalMs: 0 },
    { days: 3, hours: 4, minutes: 5, seconds: 6, done: false, totalMs: 0 },
  );
});

test("desde una fecha real: 13/11/2026 14:48 ART", () => {
  const now = new Date("2026-11-13T14:48:00-03:00").getTime();
  const t = getTimeLeft(target, now);
  // 13/11 14:48 → 20/03 21:30 = 127 días, 6 h, 42 min
  assert.equal(t.days, 127);
  assert.equal(t.hours, 6);
  assert.equal(t.minutes, 42);
  assert.equal(t.seconds, 0);
});

test("un segundo antes", () => {
  const t = getTimeLeft(target, target - 1000);
  assert.equal(t.seconds, 1);
  assert.equal(t.done, false);
});

test("al llegar la fecha marca done y no da negativos", () => {
  for (const now of [target, target + 1, target + 86400000]) {
    const t = getTimeLeft(target, now);
    assert.equal(t.done, true);
    assert.equal(t.days + t.hours + t.minutes + t.seconds, 0);
  }
});

test("fracciones de segundo se truncan (no adelanta)", () => {
  const t = getTimeLeft(target, target - 1999);
  assert.equal(t.seconds, 1);
});
