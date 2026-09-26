// A KPI: label, big number, small caption. KpiStrip lays several out in a
// row; `size` makes the two library/context counters largest.

export type CounterProps = {
  label: string;
  value: string | number;
  caption?: string | null;
  size?: "sm" | "md" | "lg"; // default md
  tone?: string | null; // css color for the value, default text color
};

const SIZES = { sm: 18, md: 26, lg: 40 } as const;

export function Counter({ label, value, caption = null, size = "md", tone = null }: CounterProps) {
  return (
    <div className={`counter counter-${size}`} style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-dim)", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontFamily: "var(--mono)", fontSize: SIZES[size], lineHeight: 1.05, fontWeight: 600, color: tone ?? "var(--fg)", whiteSpace: "nowrap" }}>{value}</span>
      {caption ? <span style={{ fontSize: 11, color: "var(--fg-dim)", whiteSpace: "nowrap" }}>{caption}</span> : null}
    </div>
  );
}

export type KpiStripProps = {
  items: CounterProps[];
  gap?: number; // px, default 24
};

export function KpiStrip({ items, gap = 24 }: KpiStripProps) {
  return (
    <div className="kpi-strip" style={{ display: "flex", gap, alignItems: "flex-end", flexWrap: "nowrap" }}>
      {items.map((it) => (
        <Counter key={it.label} {...it} />
      ))}
    </div>
  );
}
