// Checks for the wizard's date/time helpers.
//   node --experimental-strip-types scripts/test-event-datetime.mts
import {
  todayISO,
  dateShortcuts,
  formatTime,
  timeOptions,
  endFromDuration,
  describeWhen,
  isPastStart,
  toLocalDateTime,
} from "../src/lib/event-datetime.ts";

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, extra = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${extra ? ` — ${extra}` : ""}`);
  ok ? pass++ : fail++;
};

console.log("Date helpers:");
const today = todayISO();
check("todayISO is YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(today), today);

const sc = dateShortcuts();
check("4 shortcuts offered", sc.length === 4);
check("first shortcut is today", sc[0].value === today);
check(
  "all shortcuts are today or later",
  sc.every((s) => s.value >= today),
  sc.map((s) => `${s.label}=${s.value}`).join(" "),
);
check(
  "Saturday shortcut really is a Saturday",
  new Date(`${sc[2].value}T00:00:00`).getDay() === 6,
);
check(
  "Sunday shortcut really is a Sunday",
  new Date(`${sc[3].value}T00:00:00`).getDay() === 0,
);

console.log("\nTime formatting:");
check("00:00 → 12:00 AM", formatTime("00:00") === "12:00 AM");
check("09:30 → 9:30 AM", formatTime("09:30") === "9:30 AM");
check("12:00 → 12:00 PM", formatTime("12:00") === "12:00 PM");
check("18:30 → 6:30 PM", formatTime("18:30") === "6:30 PM");
check("23:30 → 11:30 PM", formatTime("23:30") === "11:30 PM");

const opts = timeOptions();
check("36 half-hour slots from 06:00", opts.length === 36);
check("first is 6:00 AM", opts[0].label === "6:00 AM");
check("last is 11:30 PM", opts[opts.length - 1].label === "11:30 PM");

console.log("\nDuration maths:");
check(
  "2h after 18:00 → 20:00 same day",
  endFromDuration("2026-08-01", "18:00", 120) === "2026-08-01T20:00",
  endFromDuration("2026-08-01", "18:00", 120),
);
check(
  "3h after 22:30 rolls to next day 01:30",
  endFromDuration("2026-08-01", "22:30", 180) === "2026-08-02T01:30",
  endFromDuration("2026-08-01", "22:30", 180),
);
check(
  "90-minute duration handled",
  endFromDuration("2026-08-01", "10:00", 90) === "2026-08-01T11:30",
);
check("empty date → empty end", endFromDuration("", "18:00", 120) === "");

console.log("\nSummary + past detection:");
check(
  "describeWhen shows a range",
  describeWhen("2026-08-01", "18:00", 120).includes("6:00 PM – 8:00 PM"),
  describeWhen("2026-08-01", "18:00", 120),
);
check("unset date → 'Not set'", describeWhen("", "", 120) === "Not set");
check("a 2020 date is past", isPastStart("2020-01-01", "10:00"));
check("a 2030 date is not past", !isPastStart("2030-01-01", "10:00"));
check("unset is not flagged past", !isPastStart("", ""));

console.log("\nCombining:");
check(
  "toLocalDateTime joins with T",
  toLocalDateTime("2026-08-01", "18:00") === "2026-08-01T18:00",
);
check("missing time → empty", toLocalDateTime("2026-08-01", "") === "");

console.log(`\nRESULT: ${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
