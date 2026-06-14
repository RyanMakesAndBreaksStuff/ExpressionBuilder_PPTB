// concept-c.jsx — Concept C: master–detail Inspector
// Center = the condition list (selectable rows + nested groups).
// Right  = an Inspector that edits ONE selected rule in full detail.
// Self-mounts to #root.

const CCmdBar = ({ theme, onTheme, mode, setMode }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, height: 50, padding: "0 12px", borderBottom: "1px solid var(--stroke2)", background: "var(--bg1)", flex: "0 0 auto" }}>
    <div style={{ width: 26, height: 26, borderRadius: "var(--r-md)", background: "var(--brand)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}><Icon name="flow" size={17} /></div>
    <span style={{ fontSize: "var(--t-body1)", fontWeight: 700 }}>Expression Builder</span>
    <span style={{ fontSize: "var(--t-caption1)", color: "var(--fg3)" }}>/</span>
    <span style={{ fontSize: "var(--t-body1)", color: "var(--fg2)", fontWeight: 600 }}>Approval routing condition</span>
    <span className="fa-pill dot" style={{ color: "var(--fg3)" }}>Draft</span>
    <div style={{ flex: 1 }} />
    <ModeSeg mode={mode} onChange={setMode} />
    <div className="fa-vdivider" style={{ height: 24, margin: "0 4px" }} />
    <button className="fa-iconbtn" title="Import"><Icon name="import" size={18} /></button>
    <button className="fa-iconbtn" title="Export"><Icon name="export" size={18} /></button>
    <button className="fa-iconbtn" title="Toggle theme" onClick={onTheme}><Icon name={theme === "dark" ? "sun" : "moon"} size={18} /></button>
    <div className="fa-vdivider" style={{ height: 24, margin: "0 2px" }} />
    <div className="fa-split"><button className="fa-btn primary"><Icon name="copy" size={16} /> Copy expression</button><button className="fa-btn primary"><Icon name="chevdown" size={16} /></button></div>
  </div>
);

/* a selectable summary row in the master list */
const CRow = ({ field, type, op, value, sel, warn, indent = 0, onClick }) => (
  <div onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 9, padding: "8px 10px 8px " + (10 + indent * 22) + "px",
    borderRadius: "var(--r-md)", cursor: "pointer",
    background: sel ? "var(--bg-sel)" : "transparent",
    boxShadow: sel ? "inset 0 0 0 1px color-mix(in srgb,var(--brand) 45%,transparent)" : "none",
    borderLeft: sel ? "3px solid var(--brand)" : "3px solid transparent",
  }}>
    <Icon name="grip" size={15} style={{ color: "var(--fg4)", cursor: "grab" }} />
    <TypeGlyph t={type} />
    <span style={{ flex: 1, minWidth: 0, fontSize: "var(--t-body1)", color: "var(--fg1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      <b style={{ fontWeight: 600 }}>{field}</b> <span style={{ color: "var(--fg3)" }}>{OP_LABEL[op]}</span>{value ? <span style={{ fontFamily: "var(--fa-mono)", fontSize: 12.5, color: "var(--fg2)" }}> {`'${value}'`}</span> : null}
    </span>
    {warn && <span title="1 warning" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--warn-icon)", flex: "0 0 auto" }} />}
    <Icon name="chevright" size={15} style={{ color: sel ? "var(--brand-fg)" : "var(--fg4)" }} />
  </div>
);

/* a group header inside the master list */
const CGroupHead = ({ logic, label, indent = 0 }) => {
  const accent = logic === "and" ? "var(--brand)" : "#7a4ec2";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px 6px " + (10 + indent * 22) + "px" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 9px", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: ".05em", color: "#fff", background: accent }}>{logic.toUpperCase()}</span>
      <span style={{ fontSize: "var(--t-caption1)", color: "var(--fg3)" }}>{label}</span>
      <div style={{ flex: 1 }} />
      <button className="fa-iconbtn sm" style={{ width: 24, height: 24 }} title="Add rule to group"><Icon name="addsm" size={14} /></button>
    </div>
  );
};

const InsLabel = ({ children, hint }) => (
  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 5 }}>
    <span className="fa-lbl" style={{ margin: 0 }}>{children}</span>
    {hint && <span style={{ fontSize: 11, color: "var(--fg3)" }}>{hint}</span>}
  </div>
);

const CInspector = ({ mode }) => (
  <div style={{ width: 380, flex: "0 0 380px", borderLeft: "1px solid var(--stroke2)", background: "var(--bg1)", display: "flex", flexDirection: "column", minHeight: 0 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: "1px solid var(--stroke2)", flex: "0 0 auto" }}>
      <Icon name="pencil" size={17} style={{ color: "var(--fg2)" }} />
      <span style={{ fontSize: "var(--t-body1)", fontWeight: 700 }}>Edit rule</span>
      <div style={{ flex: 1 }} />
      <button className="fa-iconbtn sm" title="Duplicate"><Icon name="dup" size={16} /></button>
      <button className="fa-iconbtn sm" title="Delete"><Icon name="trash" size={16} /></button>
    </div>

    <div className="fa-scroll" style={{ flex: "1 1 auto", overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* breadcrumb path */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 11.5, color: "var(--fg3)" }}>
        <span className="fa-pill" style={{ height: 20, padding: "0 7px", fontSize: 10.5 }}>AND root</span>
        <Icon name="chevright" size={12} />
        <span style={{ color: "var(--fg2)", fontWeight: 600 }}>Rule 1</span>
      </div>

      <div>
        <InsLabel hint="Choice · from sample schema">Field</InsLabel>
        <div className="fa-field" data-active="" style={{ width: "100%", height: 36 }}>
          <TypeGlyph t="choice" />
          <span className="fa-grow" style={{ fontWeight: 600 }}>Status</span>
          <Icon name="chevdown" size={16} style={{ color: "var(--fg3)" }} />
        </div>
      </div>

      <div>
        <InsLabel>Operator</InsLabel>
        <div className="fa-field" style={{ width: "100%", height: 36 }}>
          <span className="fa-grow">equals</span>
          <Icon name="chevdown" size={16} style={{ color: "var(--fg3)" }} />
        </div>
      </div>

      <div>
        <InsLabel hint="Choice value">Value</InsLabel>
        <div className="fa-field" data-active="" style={{ width: "100%", height: 36 }}>
          <span className="fa-grow">Approved</span>
          <Icon name="chevdown" size={16} style={{ color: "var(--fg3)" }} />
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {["Approved", "Rejected", "Pending"].map((v, i) => <span key={v} className="fa-pill" style={{ height: 24, cursor: "pointer", background: i === 0 ? "var(--brand-subtle)" : "var(--bg1)", borderColor: i === 0 ? "transparent" : "var(--stroke1)", color: i === 0 ? "var(--brand-fg)" : "var(--fg2)" }}>{v}</span>)}
        </div>
      </div>

      <div className="fa-divider" />

      {/* inline diagnostic for THIS rule + suggested fix */}
      <div>
        <span className="fa-eyebrow">This rule · 1 warning</span>
        <div style={{ marginTop: 8 }}>
          <Diagnostic kind="warn" title="Case-sensitive comparison"
            detail="equals() compares text exactly. “approved” would not match “Approved”." />
          <button className="fa-btn sm" style={{ marginTop: 8 }}><Icon name="wrap" size={15} /> Wrap both sides in toLower()</button>
        </div>
      </div>

      <div className="fa-divider" />

      <div>
        <span className="fa-eyebrow">Wrap value with function</span>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {["toLower", "toUpper", "trim", "coalesce"].map(fn => <span key={fn} className="fa-pill" style={{ height: 24, cursor: "pointer", fontFamily: "var(--fa-mono)", fontSize: 11.5 }}><Icon name="func" size={12} /> {fn}</span>)}
        </div>
      </div>

      <div>
        <span className="fa-eyebrow">This rule resolves as</span>
        <div style={{ marginTop: 8, background: "var(--bg3)", border: "1px solid var(--stroke2)", borderRadius: "var(--r-md)", padding: "10px 12px", overflowX: "auto" }}>
          <code className="fa-code" style={{ fontSize: 12.5 }}>
            <Fn>equals</Fn><P>(</P><Ref mode={mode} name="Status" /><P>, </P><Str>Approved</Str><P>)</P>
          </code>
        </div>
      </div>
    </div>
  </div>
);

const ConceptC = ({ theme = "light", initialMode = "trigger" }) => {
  const [t, setT] = React.useState(theme);
  const [mode, setMode] = React.useState(initialMode);
  return (
    <div className="fa-root fa-fill" data-theme={t}>
      <CCmdBar theme={t} onTheme={() => setT(p => p === "light" ? "dark" : "light")} mode={mode} setMode={setMode} />
      <div style={{ flex: "1 1 auto", display: "flex", minHeight: 0 }}>
        {/* field source */}
        <div style={{ width: 240, flex: "0 0 240px", borderRight: "1px solid var(--stroke2)", background: "var(--bg2)", minHeight: 0 }}>
          <FieldSource />
        </div>

        {/* master list */}
        <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", background: "var(--bg3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--stroke2)", background: "var(--bg2)" }}>
            <span style={{ fontSize: "var(--t-body1)", fontWeight: 700 }}>Conditions</span>
            <span className="fa-pill brand">{mode === "filter" ? "Filter array" : "Trigger condition"}</span>
            <span style={{ fontSize: "var(--t-caption1)", color: "var(--fg3)" }}>Select a rule to edit it on the right</span>
            <div style={{ flex: 1 }} />
            <button className="fa-btn subtle sm"><Icon name="add" size={15} /> Rule</button>
            <button className="fa-btn subtle sm"><Icon name="group" size={15} /> Group</button>
          </div>
          <div className="fa-scroll" style={{ flex: "1 1 auto", overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 2 }}>
            <CGroupHead logic="and" label="Match all of the following" indent={0} />
            <CRow field="Status" type="choice" op="equals" value="Approved" sel warn indent={1} />
            <CGroupHead logic="or" label="Match any of the following" indent={1} />
            <CRow field="Region" type="choice" op="equals" value="EMEA" indent={2} />
            <CRow field="Region" type="choice" op="equals" value="APAC" indent={2} />
            <CRow field="Amount" type="number" op="greater" value="5000" indent={1} />
            <CRow field="DueDate" type="dateTime" op="less" value="addDays(utcNow(), 7)" indent={1} />
            <div style={{ display: "flex", gap: 8, padding: "8px 10px 4px 32px" }}>
              <button className="fa-btn subtle sm"><Icon name="add" size={15} /> Add rule</button>
              <button className="fa-btn subtle sm"><Icon name="group" size={15} /> Add group</button>
            </div>
          </div>
          {/* bottom validity strip */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderTop: "1px solid var(--stroke2)", background: "var(--bg2)" }}>
            <Icon name="checkcirc" size={16} style={{ color: "var(--good-icon)" }} />
            <span style={{ fontSize: "var(--t-caption1)", fontWeight: 600, color: "var(--fg2)" }}>Root returns boolean</span>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--warn-icon)" }} />
            <span style={{ fontSize: "var(--t-caption1)", color: "var(--fg3)" }}>2 warnings · 0 errors</span>
            <div style={{ flex: 1, fontFamily: "var(--fa-mono)", fontSize: 11.5, color: "var(--fg3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: 10 }}>
              @and(equals({mode === "filter" ? "item" : "triggerBody"}()?['Status'],'Approved'), or(…), greater(…), less(…))
            </div>
            <button className="fa-btn sm"><Icon name="copy" size={15} /> Copy</button>
          </div>
        </div>

        <CInspector mode={mode} />
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<ConceptC theme="light" initialMode="trigger" />);
