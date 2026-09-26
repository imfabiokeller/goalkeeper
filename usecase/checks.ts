// Deterministic check functions for the earnings extraction use case.
// Plain code, no model. Each check takes (proposal, input, state) and
// returns pass or fail with reasons. Runs on Node 24 with no build step:
//   node usecase/check-samples.ts

export const QUOTED_FIELDS = [
  "periodEnd",
  "revenue",
  "netIncome",
  "dilutedEps",
  "revenuePriorYear",
  "revenueChangePct",
] as const;
export type QuotedField = (typeof QUOTED_FIELDS)[number];

export type Proposal = {
  key: string;
  company: string;
  periodEnd: string; // ISO date, last day of the reported quarter
  periodLabel: string; // "Q3 FY2026"
  revenue: number; // whole US dollars
  netIncome: number | null; // whole US dollars, negative for a loss
  dilutedEps: number | null; // US dollars per share
  revenuePriorYear: number | null; // whole US dollars, year-ago quarter
  revenueChangePct: number | null; // percent, negative for a decline
  currency: "USD";
  quotes: Partial<Record<QuotedField, string>>;
};

export type Input = {
  key: string;
  company: string;
  ticker: string;
  filedAt: string; // ISO date the 8-K was filed
  text: string; // the press release as plain text
};

export type State = { merged: Record<string, Proposal> };

export type CheckResult = { pass: boolean; reasons: string[] };
export type CheckKind = "schema" | "grounded" | "consistent";
export type Check = (proposal: unknown, input: Input, state: State) => CheckResult;

const ALLOWED_KEYS = [
  "key",
  "company",
  "periodEnd",
  "periodLabel",
  "revenue",
  "netIncome",
  "dilutedEps",
  "revenuePriorYear",
  "revenueChangePct",
  "currency",
  "quotes",
];
const MAX_QUOTE_CHARS = 400;
const MIN_DOLLARS = 1_000_000; // S&P 500 figures below this were left in millions
const MAX_DAYS_PERIOD_TO_FILING = 120;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function decimals(n: number): number {
  const s = String(n);
  const i = s.indexOf(".");
  return i < 0 ? 0 : s.length - i - 1;
}

// Whitespace, quote and dash variants are the only differences allowed
// between a quote and the input. Everything else must match exactly.
export function normalize(s: string): string {
  return s
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------- schema

export const schema: Check = (proposal, input, state) => {
  const reasons: string[] = [];
  if (!isRecord(proposal)) return { pass: false, reasons: ["proposal is not an object"] };
  const p = proposal;

  for (const k of Object.keys(p)) {
    if (!ALLOWED_KEYS.includes(k)) reasons.push(`unknown field "${k}"`);
  }
  for (const k of ALLOWED_KEYS) {
    if (!(k in p)) reasons.push(`missing field "${k}" (nullable fields must still be present)`);
  }

  if (typeof p.key !== "string" || p.key !== input.key) {
    reasons.push(`key must equal the task key "${input.key}", got ${JSON.stringify(p.key)}`);
  }
  if (typeof p.company !== "string" || p.company.trim().length === 0) {
    reasons.push("company must be a non-empty string");
  }
  if (typeof p.periodEnd !== "string" || !isValidIsoDate(p.periodEnd)) {
    reasons.push(`periodEnd must be an ISO date YYYY-MM-DD, got ${JSON.stringify(p.periodEnd)}`);
  }
  if (typeof p.periodLabel !== "string" || !/^Q[1-4] FY\d{4}$/.test(p.periodLabel)) {
    reasons.push(`periodLabel must look like "Q3 FY2026", got ${JSON.stringify(p.periodLabel)}`);
  }
  if (p.currency !== "USD") reasons.push(`currency must be "USD", got ${JSON.stringify(p.currency)}`);

  const dollars = (name: string, v: unknown, nullable: boolean) => {
    if (v === null) {
      if (!nullable) reasons.push(`${name} is required`);
      return;
    }
    if (typeof v !== "number" || !Number.isFinite(v)) {
      reasons.push(`${name} must be a number, got ${JSON.stringify(v)}`);
      return;
    }
    if (!Number.isInteger(v)) reasons.push(`${name} must be whole US dollars (an integer), got ${v}`);
    if (v !== 0 && Math.abs(v) < MIN_DOLLARS) {
      reasons.push(`${name} = ${v} is too small for whole dollars; convert millions or thousands to dollars`);
    }
  };
  dollars("revenue", p.revenue, false);
  dollars("netIncome", p.netIncome, true);
  dollars("revenuePriorYear", p.revenuePriorYear, true);

  if (p.dilutedEps !== null) {
    if (typeof p.dilutedEps !== "number" || !Number.isFinite(p.dilutedEps)) {
      reasons.push(`dilutedEps must be a number or null, got ${JSON.stringify(p.dilutedEps)}`);
    } else {
      if (decimals(p.dilutedEps) > 2) reasons.push(`dilutedEps must have at most two decimals, got ${p.dilutedEps}`);
      if (Math.abs(p.dilutedEps) >= 1000) reasons.push(`dilutedEps = ${p.dilutedEps} is not a per-share figure`);
    }
  }
  if (p.revenueChangePct !== null) {
    if (typeof p.revenueChangePct !== "number" || !Number.isFinite(p.revenueChangePct)) {
      reasons.push(`revenueChangePct must be a number or null, got ${JSON.stringify(p.revenueChangePct)}`);
    } else if (Math.abs(p.revenueChangePct) > 1000) {
      reasons.push(`revenueChangePct = ${p.revenueChangePct} is not a percentage`);
    }
  }

  if (!isRecord(p.quotes)) {
    reasons.push("quotes must be an object");
  } else {
    for (const [k, v] of Object.entries(p.quotes)) {
      if (!(QUOTED_FIELDS as readonly string[]).includes(k)) reasons.push(`quotes has unknown key "${k}"`);
      else if (typeof v !== "string" || v.trim().length === 0) reasons.push(`quotes.${k} must be a non-empty string`);
      else if (v.length > MAX_QUOTE_CHARS) reasons.push(`quotes.${k} is ${v.length} chars; quote one sentence or table row, at most ${MAX_QUOTE_CHARS}`);
    }
  }

  if (typeof p.key === "string" && state.merged[p.key]) {
    reasons.push(`key "${p.key}" is already merged; a unit is never merged twice`);
  }

  return { pass: reasons.length === 0, reasons };
};

// -------------------------------------------------------------- grounded

type Candidate = { value: number; tolerance: number; scale: number };

const SCALE_WORDS: Record<string, number> = {
  thousand: 1e3,
  thousands: 1e3,
  k: 1e3,
  million: 1e6,
  millions: 1e6,
  mm: 1e6,
  m: 1e6,
  billion: 1e9,
  billions: 1e9,
  bn: 1e9,
  b: 1e9,
  trillion: 1e12,
};
// Bare numbers in a table row may be stated in dollars, thousands or millions.
const IMPLIED_SCALES = [1, 1e3, 1e6];

const NUMBER_RE = /\(?-?\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\)?(?:\s*(thousands?|millions?|billions?|trillion|bn|mm|[kmb])\b)?/gi;

// Every number in a quote, with the tolerance implied by how it was written
// ("$109.4 billion" means 109.4e9 give or take 0.05e9).
export function numbersIn(quote: string): Candidate[] {
  const out: Candidate[] = [];
  const q = normalize(quote);
  for (const m of q.matchAll(NUMBER_RE)) {
    const whole = m[1].replace(/,/g, "");
    const frac = m[2] ?? "";
    let value = Number(whole + frac);
    if (m[0].startsWith("(") && m[0].includes(")")) value = -value;
    if (m[0].includes("-")) value = -Math.abs(value);
    const dec = frac ? frac.length - 1 : 0;
    const half = 0.5 * Math.pow(10, -dec);
    const word = m[3]?.toLowerCase();
    const scales = word ? [SCALE_WORDS[word]] : IMPLIED_SCALES;
    for (const scale of scales) {
      out.push({ value: value * scale, tolerance: half * scale + 1e-9, scale });
    }
  }
  return out;
}

function supports(quote: string, value: number, allowSignFlip: boolean): boolean {
  return numbersIn(quote).some((c) => {
    const ok = Math.abs(c.value - value) <= c.tolerance;
    return ok || (allowSignFlip && Math.abs(Math.abs(c.value) - Math.abs(value)) <= c.tolerance);
  });
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function dateVariants(iso: string): string[] {
  const [y, m, d] = iso.split("-").map(Number);
  const name = MONTHS[m - 1];
  const abbr = name.slice(0, 3);
  return [
    iso,
    `${name} ${d}, ${y}`,
    `${name} ${d} ${y}`,
    `${abbr}. ${d}, ${y}`,
    `${abbr} ${d}, ${y}`,
    `${d} ${name} ${y}`,
    `${m}/${d}/${y}`,
    `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}/${y}`,
  ];
}

// "June Quarter 2026" names no day; it grounds periodEnd only as the last
// day of that month in that year.
export function monthEndNamed(iso: string, quote: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d !== lastDay) return false;
  const q = quote.toLowerCase();
  return q.includes(MONTHS[m - 1].toLowerCase()) && q.includes(String(y));
}

export const grounded: Check = (proposal, input) => {
  const reasons: string[] = [];
  if (!isRecord(proposal)) return { pass: false, reasons: ["proposal is not an object"] };
  const p = proposal;
  const quotes = isRecord(p.quotes) ? p.quotes : {};
  const text = normalize(input.text);

  for (const field of QUOTED_FIELDS) {
    const value = p[field];
    if (value === null || value === undefined) continue;
    const quote = quotes[field];
    if (typeof quote !== "string" || quote.trim().length === 0) {
      reasons.push(`${field} = ${JSON.stringify(value)} has no quote; every extracted value carries the sentence it came from`);
      continue;
    }
    const nq = normalize(quote);
    if (nq.length < 8) {
      reasons.push(`quotes.${field} is too short to identify a passage: ${JSON.stringify(quote)}`);
      continue;
    }
    if (!text.includes(nq)) {
      reasons.push(`quotes.${field} does not appear verbatim in the input: ${JSON.stringify(quote)}`);
      continue;
    }
    if (field === "periodEnd") {
      if (typeof value !== "string" || !isValidIsoDate(value)) continue; // schema reports this
      const hit = dateVariants(value).some((v) => nq.toLowerCase().includes(v.toLowerCase()));
      if (!hit && !monthEndNamed(value, nq)) {
        reasons.push(`periodEnd ${value} is not the date written in its quote: ${JSON.stringify(quote)}`);
      }
      continue;
    }
    if (typeof value !== "number") continue; // schema reports this
    const signFlip = field === "revenueChangePct" || field === "netIncome";
    if (!supports(quote, value, signFlip)) {
      reasons.push(`${field} = ${value} does not match any number in its quote: ${JSON.stringify(quote)}`);
    }
  }
  return { pass: reasons.length === 0, reasons };
};

// ------------------------------------------------------------ consistent

export const consistent: Check = (proposal, input) => {
  const reasons: string[] = [];
  if (!isRecord(proposal)) return { pass: false, reasons: ["proposal is not an object"] };
  const p = proposal;
  const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const revenue = num(p.revenue);
  const netIncome = num(p.netIncome);
  const eps = num(p.dilutedEps);
  const prior = num(p.revenuePriorYear);
  const pct = num(p.revenueChangePct);

  if (revenue !== null && netIncome !== null && netIncome > revenue) {
    reasons.push(`netIncome ${netIncome} exceeds revenue ${revenue}; check the scale of each figure`);
  }
  if (netIncome !== null && eps !== null && netIncome !== 0 && eps !== 0 && Math.sign(netIncome) !== Math.sign(eps)) {
    reasons.push(`netIncome ${netIncome} and dilutedEps ${eps} have different signs`);
  }
  if (revenue !== null && prior !== null && pct !== null) {
    const computed = (revenue / prior - 1) * 100;
    if (Math.abs(computed - pct) > 1.0) {
      reasons.push(`revenue ${revenue} vs revenuePriorYear ${prior} is ${computed.toFixed(1)}%, but revenueChangePct says ${pct}%`);
    }
  }
  if (typeof p.periodEnd === "string" && isValidIsoDate(p.periodEnd) && isValidIsoDate(input.filedAt)) {
    const days = (Date.parse(input.filedAt) - Date.parse(p.periodEnd)) / 86_400_000;
    if (days < 0) reasons.push(`periodEnd ${p.periodEnd} is after the filing date ${input.filedAt}`);
    else if (days > MAX_DAYS_PERIOD_TO_FILING) {
      reasons.push(`periodEnd ${p.periodEnd} is ${Math.round(days)} days before the filing date ${input.filedAt}; this release reports a more recent quarter`);
    }
  }
  return { pass: reasons.length === 0, reasons };
};

export const checks: Record<CheckKind, Check> = { schema, grounded, consistent };

export function runAll(proposal: unknown, input: Input, state: State): Record<CheckKind, CheckResult> {
  return {
    schema: schema(proposal, input, state),
    grounded: grounded(proposal, input, state),
    consistent: consistent(proposal, input, state),
  };
}
