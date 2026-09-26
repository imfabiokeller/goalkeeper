# Demo use case: headline earnings from press releases

The filled version of [docs/USE-CASE.md](../docs/USE-CASE.md). Everything
the harness needs is in this folder: the lens, the inputs as text files, the
proposal shape, the three check functions, and sample proposals that
exercise every check.

```bash
node usecase/check-samples.ts
```

## The idea in one line

Each unit is one S&P 500 company's latest quarterly earnings press release
(the EX-99.1 exhibit of its 8-K on SEC EDGAR). A worker reads it and
proposes the headline numbers: revenue, net income, diluted EPS, the year-ago
revenue and the growth the company states, each with the sentence or table
row it came from. On screen: a company grid filling in, and a click shows
the numbers with the quoted lines highlighted in the release.

## 1. Inputs

- `usecase/inputs/<key>.txt`: the press release as plain text, one file per
  unit. Tables are kept one row per line with ` | ` between cells, so a
  worker can quote a row like `Net income | $ | 29,789 | $ | 23,434`.
- `usecase/inputs.json`: the index. Per unit: `key`, `company`, `ticker`,
  `cik`, `sector`, `industry`, `filedAt`, `accession`, `source` (the EDGAR
  URL), `file`, `chars`.
- Public, no login, no PDFs. Fetched from EDGAR full-text search for 8-K
  filings between July 1 and September 26, 2026, kept only if the exhibit
  reads like an earnings release (mentions diluted EPS, net income or loss,
  revenue or net sales, and a quarter). Latest such filing per company.
  The scripts are in `usecase/tools/`: `sp500.py` (the company list),
  `collect.py`, `collect2.py`, `collect3.py` (EDGAR full-text search),
  `select2.py` (fetch, filter, convert) and `html2text.py`.
- Size: median about 35k characters (roughly 9k tokens), capped at 60k. The
  headline numbers are always in the first 3k characters; the income
  statement table follows. `read_input` should page, for example 6k
  characters per call, so a worker can stay near 15k tokens per request.

## 2. Units of work

Key: `<ticker>-<filing date>`, for example `aapl-2026-07-30`. One key per
company, so units are independent and never wait on each other. The
company name and sector come from the index for display.

## 3. Proposal shape

Twelve fields. Amounts are whole US dollars, never millions.

```json
{
  "key": "aapl-2026-07-30",
  "company": "Apple Inc.",
  "periodEnd": "2026-06-27",
  "periodLabel": "Q3 FY2026",
  "revenue": 109417000000,
  "netIncome": 29789000000,
  "dilutedEps": 2.02,
  "revenuePriorYear": 94036000000,
  "revenueChangePct": 16,
  "currency": "USD",
  "quotes": {
    "periodEnd": "today announced financial results for its fiscal 2026 third quarter ended June 27, 2026",
    "revenue": "Total net sales (1) | 109,417 | 94,036 | 364,357 | 313,695",
    "netIncome": "Net income | $ | 29,789 | $ | 23,434 | $ | 101,464 | $ | 84,544",
    "dilutedEps": "Diluted earnings per share was $2.02, up 29 percent year over year",
    "revenuePriorYear": "Total net sales (1) | 109,417 | 94,036 | 364,357 | 313,695",
    "revenueChangePct": "The Company posted quarterly revenue of $109.4 billion, up 16 percent year over year."
  }
}
```

| field | type | meaning |
| --- | --- | --- |
| `key` | string | equals the task key |
| `company` | string | as the release names itself |
| `periodEnd` | ISO date | last day of the quarter reported |
| `periodLabel` | `Q[1-4] FY<year>` | the company's own fiscal labeling |
| `revenue` | integer, USD | GAAP total revenue or net sales for the quarter |
| `netIncome` | integer, USD, or null | GAAP net income, negative for a loss |
| `dilutedEps` | number, 2 decimals, or null | GAAP diluted EPS |
| `revenuePriorYear` | integer, USD, or null | the year-ago quarter's revenue as stated |
| `revenueChangePct` | number or null | the growth the release states, negative for a decline |
| `currency` | `"USD"` | fixed |
| `quotes` | object | one verbatim passage per non-null value above, at most 400 characters |

The TypeScript type is `Proposal` in `usecase/checks.ts`.

## 4. Check functions

`usecase/checks.ts` exports three functions with the signature
`(proposal, input, state) => { pass, reasons }`. `input` is
`{ key, company, ticker, filedAt, text }` and `state` is
`{ merged: { [key]: proposal } }`. No model, no network, a few
milliseconds each. Every reason names the field and the value so the next
worker on that key can fix it.

- `grounded` (criterion c1). For every non-null value: a quote exists, is
  at least 8 characters, and appears verbatim in the input (only
  whitespace, quote marks and dash variants are normalized). The value is
  in the quote: for amounts, some number in the quote times its scale word
  (thousand, million, billion) or an implied table scale (1, 1e3, 1e6)
  equals the value within the precision it was written at, so "$109.4
  billion" grounds anything from 109.35e9 to 109.45e9. For `periodEnd` the
  date is in the quote in any common format, or the quote names the month
  and year and the date is the last day of that month ("June Quarter 2026").
- `consistent` (criterion c2). Net income does not exceed revenue. EPS has
  the sign of net income. If both `revenuePriorYear` and `revenueChangePct`
  are given, the computed growth is within one point of the stated one.
  `periodEnd` is on or before `filedAt` and at most 120 days earlier.
- `schema` (criterion c3). Exactly the twelve fields, no extras, nullable
  ones present as null. Types as in the table. Amounts are integers of at
  least one million dollars (anything smaller was left in millions). EPS
  has at most two decimals. `key` equals the task key. `quotes` has only
  known keys, each a non-empty string of at most 400 characters. The key
  is not already in `state.merged`.

The gate runs all three on every proposal. A task is linked to one
criterion (c1, since grounding is what the work is), and a failure reports
the criterion of the check that failed so the screen can show it.

Known limit, on purpose: a table-row quote contains several numbers
(current quarter, prior quarter, year ago). Picking the wrong column
grounds. It usually trips `consistent` (growth off, net income above
revenue) and it is exactly the kind of thing the demo's human review is
for. Sample 04 shows a passing grounded check with a failing consistent
check for this reason.

## 5. Lens, version 1

`usecase/lens.json`, in the shape of the `lens` document in
[docs/DATABASE.md](../docs/DATABASE.md). Goal in two sentences, three
criteria each pointing at one check kind, five guidelines, six out-of-scope
lines.

## What a worker gets

- The lens, pinned.
- Its task: `key`, `criterion: "c1"`, `check: { kind: "grounded" }`.
- The last failures on this key, pinned: the `reasons` arrays.
- A briefing from retrieved library passages: precedents from other units,
  such as "banks report revenue as net revenue" or "NVIDIA's fiscal year
  runs a year ahead of the calendar".
- Tools: `read_input(key, offset?)` returns a page of the text;
  `read_state(key)` returns the merged proposal for the key or null;
  `search_library(query)`; and `submit(proposal)` or
  `ask(question, options, default)`.
- About 20 tool calls. One unit takes a model 20 to 60 seconds.

## Crowd requests, three paths

The inputs folder holds more companies than the queue is seeded with.
Seed the queue from `inputs.json` with the first 200 entries and keep the
rest as a reserve, so that "add company X" has something to add. The QR
page can list the reserve names.

- Task: "add Nvidia", "do the banks next", "add every Health Care company".
  The request names a company in the inputs and not yet merged: a task
  under c1.
- Ask: "also capture operating income", "add the dividend per share",
  "capture guidance for next quarter". A new field or criterion: an ask to
  the team, and only a human edits the lens.
- Parked: "which company had the best quarter", "rank by growth", "is
  Apple a buy", "add Shopify" (not in the inputs). Out of scope with the
  reason on screen.

## Samples

`usecase/samples/`: six hand-written proposals with the expected outcome
of each check. Two pass everything (Apple, NVIDIA). One fails only
`grounded` (Meta: transposed EPS digits and a paraphrased quote). One fails
only `consistent` (JPMorgan: the net income growth attached to revenue).
One fails only `schema` (Delta: net income left in millions, a stray field,
a bad period label). One is a duplicate merge (Apple again).

## Checklist from the brief

- Inputs text, public, 100 or more: yes, EDGAR exhibits, 395 companies.
- Units independent: yes, one company each.
- Every criterion a rule: yes, three functions, no judgment.
- Failure reasons help the next attempt: yes, each names the field, the
  value and the quote.
- One unit in 20 to 60 seconds: the headline numbers sit in the first
  page of the text.
- Understood on screen in two seconds: company, quarter, revenue, EPS, and
  the highlighted sentence.
- Three crowd paths reachable from the audience: yes, see above.
- Matters outside the room: a grounded table of this quarter's results for
  most of the S&P 500, every number one click from its source.
