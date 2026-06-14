// parts.jsx — shared Fluent-styled building blocks for the Expression Builder concepts
const { useState } = React;

/* ---------- sample field source ---------- */
const FIELDS = [
  { name: "Status",     type: "choice",   detail: "Choice" },
  { name: "Approver",   type: "string",   detail: "Text" },
  { name: "Amount",     type: "number",   detail: "Number" },
  { name: "Region",     type: "choice",   detail: "Choice" },
  { name: "DueDate",    type: "dateTime", detail: "Date/time" },
  { name: "Submitted",  type: "boolean",  detail: "Yes / No" },
  { name: "RequestId",  type: "string",   detail: "Text" },
  { name: "Department", type: "string",   detail: "Text" },
];

const TYPE_CLS = { string: "str", number: "num", dateTime: "date", boolean: "bool", choice: "choice" };
const TypeGlyph = ({ t, size }) => {
  const txt = { string: "Aa", number: "#" }[t];
  const ic = { dateTime: "cal", boolean: "toggle", choice: "list" }[t];
  return (
    <span className={"fa-typeg " + TYPE_CLS[t]} style={size ? { width: size, height: size } : null}>
      {txt || <Icon name={ic} size={12} sw={1.7} />}
    </span>
  );
};

/* ---------- field reference token (mode-aware) ---------- */
const Ref = ({ mode, name }) => (
  <>
    <span className="sx-fn">{mode === "filter" ? "item" : "triggerBody"}</span>
    <span className="sx-punct">()?[</span>
    <span className="sx-str">{`'${name}'`}</span>
    <span className="sx-punct">]</span>
  </>
);
const P = ({ children }) => <span className="sx-punct">{children}</span>;
const Fn = ({ children }) => <span className="sx-fn">{children}</span>;
const Str = ({ children }) => <span className="sx-str">{`'${children}'`}</span>;
const Num = ({ children }) => <span className="sx-num">{children}</span>;

/* ---------- the canonical demo expression, rendered with syntax color ---------- */
// mode: 'trigger' | 'filter'   error: highlight the missing Amount value
const ExpressionBody = ({ mode, error }) => (
  <code className="fa-code">
    <span className="sx-at">@</span><Fn>and</Fn><P>(</P>{"\n"}
    {"  "}<Fn>equals</Fn><P>(</P><Ref mode={mode} name="Status" /><P>, </P><Str>Approved</Str><P>),</P>{"\n"}
    {"  "}<Fn>or</Fn><P>(</P>{"\n"}
    {"    "}<Fn>equals</Fn><P>(</P><Ref mode={mode} name="Region" /><P>, </P><Str>EMEA</Str><P>),</P>{"\n"}
    {"    "}<Fn>equals</Fn><P>(</P><Ref mode={mode} name="Region" /><P>, </P><Str>APAC</Str><P>)</P>{"\n"}
    {"  "}<P>),</P>{"\n"}
    {"  "}<Fn>greater</Fn><P>(</P><Ref mode={mode} name="Amount" /><P>, </P>
    {error
      ? <span style={{ background: "var(--danger-bg)", color: "var(--danger-fg)", borderRadius: 3, padding: "0 4px", outline: "1px solid var(--danger-stroke)" }}>‹value›</span>
      : <Num>5000</Num>}
    <P>),</P>{"\n"}
    {"  "}<Fn>less</Fn><P>(</P><Ref mode={mode} name="DueDate" /><P>, </P><Fn>addDays</Fn><P>(</P><Fn>utcNow</Fn><P>(), </P><Num>7</Num><P>))</P>{"\n"}
    <P>)</P>
  </code>
);

/* ---------- mode segmented control ---------- */
const ModeSeg = ({ mode = "trigger", onChange }) => (
  <div className="fa-seg" role="tablist" aria-label="Expression mode">
    <button data-on={mode === "trigger" ? "" : undefined} onClick={() => onChange && onChange("trigger")} role="tab">
      <Icon name="bolt" size={16} /> Trigger condition
    </button>
    <button data-on={mode === "filter" ? "" : undefined} onClick={() => onChange && onChange("filter")} role="tab">
      <Icon name="filter" size={16} /> Filter array
    </button>
  </div>
);

/* ---------- field source list ---------- */
const FieldRow = ({ f, active }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", borderRadius: "var(--r-md)",
    background: active ? "var(--bg-sel)" : "transparent", cursor: "grab",
    boxShadow: active ? "inset 0 0 0 1px color-mix(in srgb,var(--brand) 35%,transparent)" : "none",
  }}>
    <Icon name="grip" size={16} style={{ color: "var(--fg4)" }} />
    <TypeGlyph t={f.type} />
    <span style={{ flex: "1 1 auto", fontSize: "var(--t-body1)", fontWeight: 600, color: "var(--fg1)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
    <span style={{ fontSize: "var(--t-caption1)", color: "var(--fg3)" }}>{f.detail}</span>
  </div>
);

const FieldSource = ({ compact }) => (
  <div style={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%" }}>
    <div style={{ padding: compact ? "12px 12px 8px" : "14px 14px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "var(--t-body1)", fontWeight: 700, color: "var(--fg1)" }}>Fields</span>
        <span className="fa-pill"><Icon name="dbase" size={13} /> Sample</span>
      </div>
      <div className="fa-input">
        <Icon name="search" size={16} style={{ color: "var(--fg3)" }} />
        <input placeholder="Search fields" defaultValue="" />
      </div>
    </div>
    <div className="fa-scroll" style={{ flex: "1 1 auto", overflowY: "auto", padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
      {FIELDS.map((f, i) => <FieldRow key={f.name} f={f} active={i === 0} />)}
    </div>
    <div style={{ borderTop: "1px solid var(--stroke2)", padding: "10px 12px", display: "flex", gap: 9, alignItems: "flex-start", background: "var(--bg2)" }}>
      <Icon name="plug" size={16} style={{ color: "var(--fg3)", marginTop: 1 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "var(--t-caption1)", fontWeight: 600, color: "var(--fg2)" }}>No Dataverse connection</div>
        <div style={{ fontSize: "var(--t-caption1)", color: "var(--fg3)", marginTop: 1 }}>
          Using sample fields. <span style={{ color: "var(--brand-fg)", fontWeight: 600, cursor: "pointer" }}>Connect</span>
        </div>
      </div>
    </div>
  </div>
);

/* ---------- value editor faces ---------- */
const ValueEditor = ({ type, value, op, error }) => {
  if (op === "empty" || op === "notEmpty") {
    return <span style={{ fontSize: "var(--t-caption1)", color: "var(--fg3)", fontStyle: "italic", padding: "0 4px", alignSelf: "center" }}>no value needed</span>;
  }
  if (type === "choice") {
    return (
      <div className="fa-field" data-active="" style={{ flex: "1 1 auto" }}>
        <span className="fa-grow">{value}</span>
        <Icon name="chevdown" size={16} style={{ color: "var(--fg3)" }} />
      </div>
    );
  }
  if (type === "boolean") {
    return (
      <div className="fa-field" style={{ flex: "1 1 auto" }}>
        <span className="fa-grow">{value}</span>
        <Icon name="chevdown" size={16} style={{ color: "var(--fg3)" }} />
      </div>
    );
  }
  return (
    <div className={"fa-input" + (error ? " " : "")} style={{ flex: "1 1 auto", borderBottomColor: error ? "var(--danger-fg)" : undefined, borderColor: error ? "var(--danger-stroke)" : undefined }}>
      {type === "number" && <span style={{ color: "var(--fg4)", fontSize: 12 }}>#</span>}
      {type === "dateTime" && <Icon name="cal" size={15} style={{ color: "var(--fg4)" }} />}
      <input placeholder={error ? "Enter a value" : (type === "number" ? "0" : "Value")} defaultValue={error ? "" : value} style={error ? { } : null} />
    </div>
  );
};

/* ---------- operator names ---------- */
const OP_LABEL = {
  equals: "equals", notEquals: "does not equal", contains: "contains",
  startsWith: "starts with", endsWith: "ends with", greater: "is greater than",
  less: "is less than", greaterOrEquals: "is ≥", lessOrEquals: "is ≤",
  empty: "is empty", notEmpty: "is not empty",
};

/* ---------- a single rule row ---------- */
const RuleRow = ({ field, type, op, value, wrap, error, focus, onActions = true }) => (
  <div className={"fa-foc"} data-focus={focus ? "" : undefined} style={{
    display: "flex", alignItems: "center", gap: 8, padding: "7px 8px 7px 6px", borderRadius: "var(--r-md)",
    background: error ? "var(--danger-bg)" : (focus ? "var(--bg-sel)" : "var(--bg1)"),
    border: "1px solid " + (error ? "var(--danger-stroke)" : (focus ? "color-mix(in srgb,var(--brand) 45%,transparent)" : "var(--stroke2)")),
  }}>
    <Icon name="grip" size={16} style={{ color: "var(--fg4)", cursor: "grab" }} />
    <div className="fa-field" style={{ flex: "1.3 1 0", minWidth: 0 }}>
      <TypeGlyph t={type} />
      <span className="fa-grow" style={{ fontWeight: 600 }}>{field}</span>
      <Icon name="chevdown" size={16} style={{ color: "var(--fg3)" }} />
    </div>
    <div className="fa-field" style={{ flex: "1.1 1 0", minWidth: 0 }}>
      <span className="fa-grow">{OP_LABEL[op]}</span>
      <Icon name="chevdown" size={16} style={{ color: "var(--fg3)" }} />
    </div>
    <div style={{ flex: "1.4 1 0", display: "flex", minWidth: 0 }}>
      <ValueEditor type={type} value={value} op={op} error={error} />
    </div>
    {wrap
      ? <span className="fa-pill" title={"Wrapped with " + wrap + "()"} style={{ cursor: "pointer" }}><Icon name="func" size={13} /> {wrap}</span>
      : <button className="fa-iconbtn sm" title="Wrap with function"><Icon name="wrap" size={16} /></button>}
    <button className="fa-iconbtn sm" title="Duplicate rule"><Icon name="dup" size={16} /></button>
    <button className="fa-iconbtn sm" title="Delete rule"><Icon name="trash" size={16} /></button>
  </div>
);

/* ---------- logic toggle (AND / OR) ---------- */
const LogicToggle = ({ logic }) => (
  <div className="fa-seg" style={{ padding: 2 }}>
    <button data-on={logic === "and" ? "" : undefined} style={{ height: 24, padding: "0 12px", fontSize: "var(--t-caption1)" }}>AND</button>
    <button data-on={logic === "or" ? "" : undefined} style={{ height: 24, padding: "0 12px", fontSize: "var(--t-caption1)" }}>OR</button>
  </div>
);

/* ---------- group card (recursive shell) ---------- */
const GroupCard = ({ logic = "and", depth = 0, label, count, children, actions = true }) => {
  const accent = logic === "and" ? "var(--brand)" : "#7a4ec2";
  return (
    <div style={{
      borderRadius: "var(--r-lg)", border: "1px solid var(--stroke1)",
      background: depth === 0 ? "var(--bg2)" : "var(--bg1)",
      boxShadow: depth === 0 ? "none" : "var(--shadow2)",
      borderLeft: "3px solid " + accent, overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px 9px 11px", borderBottom: "1px solid var(--stroke2)" }}>
        {depth > 0 && <Icon name="grip" size={16} style={{ color: "var(--fg4)", cursor: "grab" }} />}
        <Icon name="collapse" size={16} style={{ color: "var(--fg3)" }} />
        <LogicToggle logic={logic} />
        <span style={{ fontSize: "var(--t-caption1)", color: "var(--fg3)" }}>
          {logic === "and" ? "Match all" : "Match any"}{typeof count === "number" ? ` · ${count} rules` : ""}
        </span>
        <div style={{ flex: 1 }} />
        <button className="fa-btn subtle sm"><Icon name="addsm" size={15} /> Rule</button>
        <button className="fa-btn subtle sm"><Icon name="group" size={15} /> Group</button>
        {depth > 0 && <button className="fa-iconbtn sm" title="Delete group"><Icon name="trash" size={16} /></button>}
      </div>
      <div style={{ padding: depth === 0 ? "10px" : "9px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    </div>
  );
};

/* ---------- diagnostics ---------- */
const DIAG_STYLE = {
  error: { icon: "errorcirc", c: "var(--danger-fg)", bg: "var(--danger-bg)", stroke: "var(--danger-stroke)" },
  warn:  { icon: "warn",      c: "var(--warn-icon)",  bg: "var(--warn-bg)",   stroke: "var(--warn-stroke)" },
  info:  { icon: "info",      c: "var(--info-icon)",  bg: "var(--bg2)",       stroke: "var(--stroke2)" },
  good:  { icon: "checkcirc", c: "var(--good-icon)",  bg: "var(--good-bg)",   stroke: "var(--good-stroke)" },
};
const Diagnostic = ({ kind, title, detail, where }) => {
  const s = DIAG_STYLE[kind];
  return (
    <div style={{ display: "flex", gap: 9, padding: "9px 10px", borderRadius: "var(--r-md)", background: s.bg, border: "1px solid " + s.stroke }}>
      <Icon name={s.icon} size={17} style={{ color: s.c, marginTop: 1 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: "var(--t-caption1)", fontWeight: 700, color: "var(--fg1)", display: "flex", gap: 8, alignItems: "baseline" }}>
          <span style={{ flex: 1 }}>{title}</span>
          {where && <span style={{ fontWeight: 600, color: "var(--fg3)", fontFamily: "var(--fa-mono)", fontSize: 11 }}>{where}</span>}
        </div>
        <div style={{ fontSize: "var(--t-caption1)", color: "var(--fg2)", marginTop: 2, lineHeight: 1.4 }}>{detail}</div>
      </div>
    </div>
  );
};

Object.assign(window, {
  FIELDS, TypeGlyph, Ref, ExpressionBody, ModeSeg, FieldSource, FieldRow,
  ValueEditor, RuleRow, LogicToggle, GroupCard, Diagnostic, OP_LABEL,
});
