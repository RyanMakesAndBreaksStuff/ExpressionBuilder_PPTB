// icons.jsx — minimal Fluent-style line icons (20px grid, currentColor stroke)
const Icon = ({ name, size = 20, sw = 1.5, style }) => {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    flow: <><path {...p} d="M5 4.5h6l4 4v7a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 15.5V6A1.5 1.5 0 0 1 5.5 4.5Z"/><path {...p} d="M11 4.5V8h4"/><path {...p} d="M8.5 11.5h3M8.5 14h3"/></>,
    bolt: <path {...p} d="M11 3 5 11h4l-1 6 6-8h-4l1-6Z"/>,
    copy: <><rect {...p} x="7" y="7" width="9" height="9" rx="1.5"/><path {...p} d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7"/></>,
    import: <><path {...p} d="M10 3.5v8"/><path {...p} d="m6.5 8 3.5 3.5L13.5 8"/><path {...p} d="M4.5 14.5h11"/></>,
    export: <><path {...p} d="M10 11.5v-8"/><path {...p} d="m6.5 7 3.5-3.5L13.5 7"/><path {...p} d="M4.5 14.5h11"/></>,
    settings: <><circle {...p} cx="10" cy="10" r="2.2"/><path {...p} d="M10 3.5v1.7M10 14.8v1.7M3.5 10h1.7M14.8 10h1.7M5.4 5.4l1.2 1.2M13.4 13.4l1.2 1.2M14.6 5.4l-1.2 1.2M6.6 13.4 5.4 14.6"/></>,
    more: <><circle cx="5" cy="10" r="1.4" fill="currentColor"/><circle cx="10" cy="10" r="1.4" fill="currentColor"/><circle cx="15" cy="10" r="1.4" fill="currentColor"/></>,
    search: <><circle {...p} cx="9" cy="9" r="4.5"/><path {...p} d="m12.5 12.5 3 3"/></>,
    add: <path {...p} d="M10 4.5v11M4.5 10h11"/>,
    addsm: <path {...p} d="M8 3.5v9M3.5 8h9"/>,
    trash: <><path {...p} d="M5 6h10M8 6V4.8A.8.8 0 0 1 8.8 4h2.4a.8.8 0 0 1 .8.8V6M6.5 6l.5 8.2a1 1 0 0 0 1 .95h4a1 1 0 0 0 1-.95L14.5 6"/></>,
    copy2: <><rect {...p} x="6" y="6" width="9" height="9" rx="1.5"/><path {...p} d="M12 6V5a1.5 1.5 0 0 0-1.5-1.5h-5A1.5 1.5 0 0 0 4 5v5A1.5 1.5 0 0 0 5.5 11.5H6"/></>,
    grip: <><circle cx="7.5" cy="6" r="1.1" fill="currentColor"/><circle cx="12.5" cy="6" r="1.1" fill="currentColor"/><circle cx="7.5" cy="10" r="1.1" fill="currentColor"/><circle cx="12.5" cy="10" r="1.1" fill="currentColor"/><circle cx="7.5" cy="14" r="1.1" fill="currentColor"/><circle cx="12.5" cy="14" r="1.1" fill="currentColor"/></>,
    chevdown: <path {...p} d="m5.5 8 4.5 4.5L14.5 8"/>,
    chevright: <path {...p} d="m8 5.5 4.5 4.5L8 14.5"/>,
    chevup: <path {...p} d="m5.5 12 4.5-4.5L14.5 12"/>,
    warn: <><path {...p} d="M10 3.8 17 16H3l7-12.2Z"/><path {...p} d="M10 8.2v3.4"/><circle cx="10" cy="14" r=".9" fill="currentColor" stroke="none"/></>,
    errorcirc: <><circle {...p} cx="10" cy="10" r="6.5"/><path {...p} d="m7.8 7.8 4.4 4.4M12.2 7.8l-4.4 4.4"/></>,
    check: <path {...p} d="m4.5 10.5 3.5 3.5 7.5-7.5"/>,
    checkcirc: <><circle {...p} cx="10" cy="10" r="6.5"/><path {...p} d="m7 10 2 2 4-4"/></>,
    info: <><circle {...p} cx="10" cy="10" r="6.5"/><path {...p} d="M10 9v4"/><circle cx="10" cy="6.7" r=".9" fill="currentColor" stroke="none"/></>,
    func: <><path {...p} d="M12.5 4.5h-1.2A1.6 1.6 0 0 0 9.7 6.1L7.6 14a1.6 1.6 0 0 1-1.6 1.5H5"/><path {...p} d="M6.3 9.2h5"/></>,
    group: <><rect {...p} x="3.5" y="3.5" width="13" height="13" rx="2"/><path {...p} d="M7 7.5h6M7 10h6M7 12.5h3.5"/></>,
    moon: <path {...p} d="M15.5 11.2A6 6 0 1 1 8.8 4.5a4.8 4.8 0 0 0 6.7 6.7Z"/>,
    sun: <><circle {...p} cx="10" cy="10" r="3"/><path {...p} d="M10 3.5v1.4M10 15.1v1.4M3.5 10h1.4M15.1 10h1.4M5.5 5.5l1 1M13.5 13.5l1 1M14.5 5.5l-1 1M6.5 13.5l-1 1"/></>,
    plug: <><path {...p} d="M8 4v3M12 4v3"/><path {...p} d="M6.5 7h7v2.5a3.5 3.5 0 0 1-7 0V7Z"/><path {...p} d="M10 13v3.5"/></>,
    dbase: <><ellipse {...p} cx="10" cy="5.5" rx="5.5" ry="2"/><path {...p} d="M4.5 5.5v9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-9"/><path {...p} d="M4.5 10c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2"/></>,
    pencil: <path {...p} d="M13.5 4.5l2 2-7.5 7.5-2.6.6.6-2.6 7.5-7.5Z"/>,
    eye: <><path {...p} d="M2.5 10S5 5.5 10 5.5 17.5 10 17.5 10 15 14.5 10 14.5 2.5 10 2.5 10Z"/><circle {...p} cx="10" cy="10" r="2"/></>,
    panel: <><rect {...p} x="3.5" y="4.5" width="13" height="11" rx="1.5"/><path {...p} d="M12 4.5v11"/></>,
    sidebar: <><rect {...p} x="3.5" y="4.5" width="13" height="11" rx="1.5"/><path {...p} d="M8 4.5v11"/></>,
    refresh: <><path {...p} d="M15 7a5.5 5.5 0 1 0 1.2 3.5"/><path {...p} d="M16 4v3.2h-3.2"/></>,
    filter: <path {...p} d="M4 5h12l-4.6 5.4V15L8.6 13.5v-3.1L4 5Z"/>,
    wrap: <><path {...p} d="M5 6.5h7a2.5 2.5 0 0 1 0 5H7"/><path {...p} d="m9 9.5-2.2 2 2.2 2"/></>,
    dup: <><rect {...p} x="7" y="7" width="8.5" height="8.5" rx="1.5"/><rect {...p} x="4.5" y="4.5" width="8.5" height="8.5" rx="1.5"/></>,
    cal: <><rect {...p} x="4" y="5" width="12" height="11" rx="1.5"/><path {...p} d="M4 8h12M7 3.5V6M13 3.5V6"/></>,
    toggle: <><rect {...p} x="3.5" y="6.5" width="13" height="7" rx="3.5"/><circle {...p} cx="13" cy="10" r="2"/></>,
    list: <><path {...p} d="M7 6h9M7 10h9M7 14h9"/><circle cx="4.2" cy="6" r=".9" fill="currentColor" stroke="none"/><circle cx="4.2" cy="10" r=".9" fill="currentColor" stroke="none"/><circle cx="4.2" cy="14" r=".9" fill="currentColor" stroke="none"/></>,
    collapse: <path {...p} d="M5 8h10M7.5 5.5 5 8l2.5 2.5M12.5 5.5 15 8l-2.5 2.5"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: "block", flex: "0 0 auto", ...style }} aria-hidden="true">
      {paths[name] || null}
    </svg>
  );
};

Object.assign(window, { Icon });
