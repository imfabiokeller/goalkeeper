// Program text in mono, wrapping long lines, no highlighting.

export type CodeBlockProps = {
  code: string | null;
  label?: string | null;
  maxHeight?: number | string; // css, default none
  fontSize?: number; // default 12
};

export function CodeBlock({ code, label = null, maxHeight, fontSize = 12 }: CodeBlockProps) {
  return (
    <div className="code-block" style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      {label ? <span style={{ fontSize: 11, color: "var(--fg-dim)", fontFamily: "var(--mono)" }}>{label}</span> : null}
      <pre
        style={{
          margin: 0,
          padding: 8,
          background: "var(--bg-raised)",
          border: "1px solid var(--line)",
          borderRadius: 2,
          fontSize,
          lineHeight: 1.4,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          overflow: "auto",
          maxHeight,
          color: code ? "var(--fg)" : "var(--fg-dim)",
        }}
      >
        {code ?? "no program"}
      </pre>
    </div>
  );
}
