// Unit checks for the shared validation rules.
//   node scripts/test-validation.mts
import { validateEvent, httpUrl, tagList, LIMITS } from "../src/lib/validation.ts";
import { isCategory } from "../src/config/categories.ts";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, extra = "") {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${extra ? ` — ${extra}` : ""}`);
  ok ? pass++ : fail++;
}

const future = new Date(Date.now() + 86400_000).toISOString().slice(0, 16);
const past = new Date(Date.now() - 86400_000).toISOString().slice(0, 16);
const valid = {
  title: "Wheel-throwing pottery",
  category: "Pottery",
  capacity: 15,
  price: 800,
  is_free: false,
  starts_at: future,
  venue_name: "The Clay Studio",
};

console.log("Event validation:");
check("valid event passes", validateEvent(valid, true, isCategory).length === 0);
check(
  "past start rejected on publish",
  validateEvent({ ...valid, starts_at: past }, true, isCategory).some((e) =>
    e.includes("future"),
  ),
);
check(
  "past start ALLOWED as draft",
  !validateEvent({ ...valid, starts_at: past }, false, isCategory).some((e) =>
    e.includes("future"),
  ),
);
check(
  "short title rejected",
  validateEvent({ ...valid, title: "ab" }, true, isCategory).length > 0,
);
check(
  "over-long title rejected",
  validateEvent({ ...valid, title: "x".repeat(200) }, true, isCategory).length > 0,
);
check(
  "bad category rejected",
  validateEvent({ ...valid, category: "Nonsense" }, true, isCategory).length > 0,
);
check(
  "zero capacity rejected",
  validateEvent({ ...valid, capacity: 0 }, true, isCategory).length > 0,
);
check(
  "absurd capacity rejected",
  validateEvent({ ...valid, capacity: 99999 }, true, isCategory).length > 0,
);
check(
  "negative price rejected",
  validateEvent({ ...valid, price: -5 }, true, isCategory).length > 0,
);
check(
  "absurd price rejected",
  validateEvent({ ...valid, price: 99999999 }, true, isCategory).length > 0,
);
check(
  "end before start rejected",
  validateEvent(
    { ...valid, ends_at: new Date(Date.now() + 3600_000).toISOString().slice(0, 16) },
    true,
    isCategory,
  ).some((e) => e.includes("End time")),
);
check(
  "missing venue rejected on publish",
  validateEvent({ ...valid, venue_name: "" }, true, isCategory).some((e) =>
    e.includes("Venue"),
  ),
);
check(
  "missing venue ALLOWED as draft",
  !validateEvent({ ...valid, venue_name: "" }, false, isCategory).some((e) =>
    e.includes("Venue"),
  ),
);
check(
  "invalid maps url rejected",
  validateEvent({ ...valid, maps_url: "not a url" }, true, isCategory).length > 0,
);

console.log("\nURL normalisation:");
check("bare domain gets https", httpUrl("aikyam.app") === "https://aikyam.app/");
check("https preserved", httpUrl("https://x.com/a") === "https://x.com/a");
check("javascript: rejected", httpUrl("javascript:alert(1)") === null);
check("no-dot hostname rejected", httpUrl("localhost") === null);
check("empty rejected", httpUrl("") === null);

console.log("\nTag lists:");
check(
  "count capped",
  tagList("a,b,c,d,e,f,g,h,i,j,k,l", LIMITS.tags).length === LIMITS.tags.maxCount,
);
check(
  "each tag length capped",
  tagList("x".repeat(100), LIMITS.tags)[0].length === LIMITS.tags.maxLen,
);
check("blanks dropped", tagList("a,,  ,b", LIMITS.tags).length === 2);

console.log(`\nRESULT: ${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
