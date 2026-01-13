import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
$1} from "lucide-react";

// -------------------------------------------------
// Error Boundary (prevents blank screen on runtime errors)
// -------------------------------------------------

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error("App crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        }}>
          <div style={{ maxWidth: 520, width: "100%", borderRadius: 16, padding: 16, border: "1px solid rgba(0,0,0,0.2)", background: "#fff" }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>The app hit a runtime error.</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>Open the browser console to see the full stack trace.</div>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, margin: 0 }}>{String(this.state.error?.message || this.state.error || "Unknown error")}</pre>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}


// -------------------------------------------------
// Types
// -------------------------------------------------

type BtnVariant = "default" | "secondary" | "destructive";

type Route = "toolbox" | "beacon_home" | "beacon_app" | "deployment";

type Status = "In Stock" | "In Transit" | "In Use";

type LocationOpt = "Birmingham Office" | "Atlanta Office" | "Jobsite Location";

type RangeState = {
  samples: number[];
  lastSeenMs: number;
  emaMeters: number | null;
  madMeters: number | null;
  deltaMeters: number | null;
  lastEmaMeters: number | null;
  lastRssi: number | null;
};

// -------------------------------------------------
// Config + Mock Data
// -------------------------------------------------

const API_BASE = "http://localhost:8080";
const ORG_UUID = "2F234454-CF6D-4A0F-ADF2-F4911BA9FFA6";

const THEMES = {
  dark: {
    name: "Dark",
    accent: "#22fafa",
    bg: "#212121",
    text: "#ffffff",
    surface: "rgba(255,255,255,0.10)",
    border: "rgba(255,255,255,0.18)",
    muted: "rgba(255,255,255,0.78)",
  },
  light: {
    name: "Light",
    accent: "#2167ad",
    bg: "#ffffff",
    text: "#0b0b0b",
    surface: "rgba(0,0,0,0.04)",
    border: "rgba(0,0,0,0.12)",
    muted: "rgba(0,0,0,0.62)",
  },
} as const;

// Put your logo at /public/brand-mark.png
const BRAND_LOGO_PATH = "/brand-mark.png";

const MOCK = {
  jobsites: [
    { major: 23456, name: "23456 - BHM JS Tech II" },
    { major: 9567, name: "09567 - Microsoft Data Center" },
  ],
  beaconAssets: [
    {
      id: "a1",
      displayName: "Access Point – C1234",
      assetType: "Access Point",
      assetTag: "C1234",
      jobsiteMajor: 23456,
      locationHint: "IDF-2, Rack A",
      beacon: { uuid: ORG_UUID, major: 23456, minor: 501 },
    },
    {
      id: "a2",
      displayName: "Switch – C2388",
      assetType: "Switch",
      assetTag: "C2388",
      jobsiteMajor: 23456,
      locationHint: "MDF, Rack B",
      beacon: { uuid: ORG_UUID, major: 23456, minor: 502 },
    },
    {
      id: "a3",
      displayName: "Cradlepoint – C9910",
      assetType: "Cradlepoint",
      assetTag: "C9910",
      jobsiteMajor: 9567,
      locationHint: "Trailer, Network Cabinet",
      beacon: { uuid: ORG_UUID, major: 9567, minor: 601 },
    },
    // Out-of-range / offline demo rows
    {
      id: "a4",
      displayName: "Access Point – C4501",
      assetType: "Access Point",
      assetTag: "C4501",
      jobsiteMajor: 9567,
      locationHint: "IDF-1, Rack C",
      beacon: { uuid: ORG_UUID, major: 9567, minor: 602 },
      simulate: false,
    },
    {
      id: "a5",
      displayName: "Switch – C4502",
      assetType: "Switch",
      assetTag: "C4502",
      jobsiteMajor: 9567,
      locationHint: "MDF, Rack D",
      beacon: { uuid: ORG_UUID, major: 9567, minor: 603 },
      simulate: false,
    },
  ],
  ticketDB: {
    "INC-10001": ["C1234"],
    "SR-20498": [],
  } as Record<string, string[]>,
};

const STATUS_OPTIONS: Status[] = ["In Stock", "In Transit", "In Use"];
const LOCATION_OPTIONS: LocationOpt[] = ["Birmingham Office", "Atlanta Office", "Jobsite Location"];

// -------------------------------------------------
// Helpers
// -------------------------------------------------

const nowMs = () => Date.now();

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function ft(meters: number | null) {
  if (meters == null || Number.isNaN(meters) || meters < 0) return null;
  return meters * 3.28084;
}

function formatAge(ms: number | null) {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 120) return `${s}s`;
  return `${Math.round(s / 60)}m`;
}

function median(arr: number[]) {
  if (!arr.length) return null;
  const a = [...arr].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function mad(arr: number[]) {
  if (arr.length < 4) return null;
  const med = median(arr) as number;
  const dev = arr.map((x) => Math.abs(x - med));
  return median(dev);
}

function stabilityLabel(madMeters: number | null) {
  if (madMeters == null) return { label: "Warming up", variant: "secondary" as const };
  if (madMeters < 0.25) return { label: "Stable", variant: "default" as const };
  if (madMeters < 0.6) return { label: "Moderate", variant: "secondary" as const };
  return { label: "Unstable", variant: "destructive" as const };
}

function trendLabel(deltaMeters: number | null) {
  if (deltaMeters == null) return { Icon: ArrowRight, label: "Collecting" };
  if (Math.abs(deltaMeters) < 0.2) return { Icon: ArrowRight, label: "Flat" };
  if (deltaMeters < 0) return { Icon: ArrowUpRight, label: "Getting closer" };
  return { Icon: ArrowDownRight, label: "Getting farther" };
}

function beaconKey(b: any) {
  return `${b.uuid}|${b.major}|${b.minor}`;
}

function haversineMeters(a: any, b: any) {
  if (!a || !b) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

// -------------------------------------------------
// Global styles
// -------------------------------------------------

function GlobalStyles({ themeKey, theme }: { themeKey: "dark" | "light"; theme: any }) {
  return (
    <style>{`
      :root { color-scheme: light dark; }
      * { box-sizing: border-box; }
      html, body { height: 100%; }
      body { margin: 0; }
      select, input, button { font-family: inherit; }
      select { color: ${theme.text} !important; background: ${theme.surface} !important; }
      select option { color: ${theme.text} !important; background: ${themeKey === "dark" ? "#111" : "#fff"} !important; }
      input[type="file"] { color: ${theme.text} !important; }

      /* Settings font override */
      .settings-font {
        font-family: ui-rounded, "SF Pro Rounded", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial;
      }
    `}</style>
  );
}

// -------------------------------------------------
// Local UI components
// -------------------------------------------------

function Button({ children, onClick, disabled, variant = "default", style, className, title, type }: any) {
  const base: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid var(--border)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    userSelect: "none",
    background: "transparent",
    color: "var(--text)",
    fontWeight: 900,
    lineHeight: 1,
    transition: "transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease, border-color 120ms ease",
    boxShadow: "0 1px 0 rgba(0,0,0,0.05)",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const variants: Record<BtnVariant, React.CSSProperties> = {
    default: {
      background: "var(--accent)",
      borderColor: "color-mix(in srgb, var(--accent) 65%, var(--border))",
      color: "var(--bg)",
      boxShadow: "0 10px 24px rgba(0,0,0,0.14)",
    },
    secondary: {
      background: "var(--surface)",
      borderColor: "var(--border)",
      color: "var(--text)",
      boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
    },
    destructive: {
      background: "rgba(220, 38, 38, 0.16)",
      border: "1px solid rgba(220, 38, 38, 0.4)",
      color: "var(--text)",
      boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
    },
  };

  return (
    <button
      title={title}
      type={type ?? "button"}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={className}
      style={{ ...base, ...(variants[variant] ?? variants.secondary), ...style }}
      onMouseDown={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)";
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
    >
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, type = "text", accept, className, style, ...rest }: any) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      accept={accept}
      className={className}
      {...rest}
      style={{
        width: "100%",
        padding: "12px 12px",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--text)",
        outline: "none",
        boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
        fontSize: 15,
        ...style,
      }}
    />
  );
}

function Badge({ children, variant = "default", className, style }: any) {
  const styles: Record<string, React.CSSProperties> = {
    default: {
      background: "color-mix(in srgb, var(--accent) 18%, var(--surface))",
      border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))",
      color: "var(--text)",
    },
    secondary: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      color: "var(--muted)",
    },
    destructive: {
      background: "rgba(220, 38, 38, 0.14)",
      border: "1px solid rgba(220, 38, 38, 0.35)",
      color: "var(--text)",
    },
  };
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: 0.2,
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        ...(styles[variant] ?? styles.secondary),
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function Separator({ style }: any) {
  return <div style={{ width: "100%", height: 1, background: "var(--border)", margin: "12px 0", ...style }} />;
}

// Tabs (minimal)
const TabsCtx = React.createContext<{ value: string; onValueChange: (v: string) => void } | null>(null);

function Tabs({ value, onValueChange, children }: any) {
  return (
    <TabsCtx.Provider value={{ value, onValueChange }}>
      <div>{children}</div>
    </TabsCtx.Provider>
  );
}

function TabsList({ children }: any) {
  return <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>;
}

function TabsTrigger({ children, value, disabled }: any) {
  const ctx = React.useContext(TabsCtx);
  const active = ctx?.value === value;
  return (
    <Button variant={active ? "default" : "secondary"} disabled={disabled} onClick={() => ctx?.onValueChange(value)} style={{ borderRadius: 999 }}>
      {children}
    </Button>
  );
}

// Select (native)
function Select({ value, onValueChange, children, style }: any) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      style={{
        width: "100%",
        padding: "12px 12px",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--text)",
        outline: "none",
        fontSize: 15,
        boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
        appearance: "none",
        WebkitAppearance: "none",
        ...style,
      }}
    >
      {children}
    </select>
  );
}

function SelectItem({ value, children, ...rest }: any) {
  return (
    <option value={value} {...rest}>
      {children}
    </option>
  );
}

// -------------------------------------------------
// App shell
// -------------------------------------------------

function ThemeVars({ theme, children }: any) {
  return (
    <div
      style={
        {
          // @ts-ignore
          "--accent": theme.accent,
          // @ts-ignore
          "--bg": theme.bg,
          // @ts-ignore
          "--text": theme.text,
          // @ts-ignore
          "--surface": theme.surface,
          // @ts-ignore
          "--border": theme.border,
          // @ts-ignore
          "--muted": theme.muted,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

function PhoneFrame({ children, bottomBar, theme }: any) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backgroundColor: theme.bg,
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 390,
          aspectRatio: "9 / 16",
          borderRadius: 36,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: theme.bg,
          color: theme.text,
          border: `1px solid ${theme.border}`,
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          // vars
          // @ts-ignore
          "--accent": theme.accent,
          // @ts-ignore
          "--bg": theme.bg,
          // @ts-ignore
          "--text": theme.text,
          // @ts-ignore
          "--surface": theme.surface,
          // @ts-ignore
          "--border": theme.border,
          // @ts-ignore
          "--muted": theme.muted,
        } as React.CSSProperties}
      >
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {children}
        </div>

        {bottomBar ? (
          <div style={{ padding: "12px 12px", borderTop: `1px solid ${theme.border}`, background: theme.bg }}>{bottomBar}</div>
        ) : null}
      </div>
    </div>
  );
}

function Header({ title, subtitle, theme, leftGlyph }: any) {
  const isLight = String(theme?.bg || "").toLowerCase() === "#ffffff";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div
          style={{
            height: 30,
            width: 30,
            borderRadius: 12,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "color-mix(in srgb, var(--accent) 16%, var(--surface))",
            border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))",
            flex: "0 0 auto",
          }}
        >
          <img
            src={BRAND_LOGO_PATH}
            alt="Brand"
            style={{
              height: 22,
              width: 22,
              objectFit: "contain",
              // If your logo is white, invert it in light mode to make it black.
              filter: isLight ? "invert(1)" : "invert(0)",
              opacity: 0.92,
              display: "block",
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
          {leftGlyph === null ? null : leftGlyph ? (
            <span style={{ display: "inline-flex", flex: "0 0 auto" }}>{leftGlyph}</span>
          ) : (
            <Radar style={{ height: 20, width: 20, color: theme.accent, flex: "0 0 auto" }} />
          )}

          <div
            style={{
              fontSize: 22,
              fontWeight: 950,
              letterSpacing: -0.4,
              color: theme.text,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
        </div>
      </div>

      {subtitle ? <div style={{ fontSize: 13, lineHeight: 1.35, color: theme.muted }}>{subtitle}</div> : null}
    </div>
  );
}

function SurfaceCard({ children, theme, style }: any) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 16,
        backgroundColor: theme.surface,
        border: `1px solid ${theme.border}`,
        boxShadow: "0 10px 26px rgba(0,0,0,0.10)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function BottomNav({ left, center, right }: any) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, alignItems: "center", width: "100%" }}>
      <div style={{ minWidth: 0, display: "flex", justifyContent: "flex-start" }}>{left}</div>
      <div style={{ minWidth: 0, display: "flex", justifyContent: "center" }}>{center}</div>
      <div style={{ minWidth: 0, display: "flex", justifyContent: "flex-end" }}>{right}</div>
    </div>
  );
}

function AvatarIcon({ assetType, theme }: any) {
  const t = (assetType || "").toLowerCase();
  const style = { color: theme.accent };
  if (t.includes("access") || t.includes("ap")) return <Wifi className="h-5 w-5" style={style} />;
  if (t.includes("switch") || t.includes("router")) return <Server className="h-5 w-5" style={style} />;
  return <MapPin className="h-5 w-5" style={style} />;
}

// -------------------------------------------------
// Backend-or-mock hook
// -------------------------------------------------

function useBackendOrMock() {
  const [mode, setMode] = useState<"checking" | "backend" | "mock">("checking");
  const [jobsites, setJobsites] = useState<any[]>([]);
  const [beaconAssets, setBeaconAssets] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/health`);
        if (!r.ok) throw new Error("health not ok");
        const j = await (await fetch(`${API_BASE}/api/jobsites`)).json();
        const a = await (await fetch(`${API_BASE}/api/assets`)).json();
        if (cancelled) return;
        setJobsites(j.jobsites || []);
        setBeaconAssets(a.assets || []);
        setMode("backend");
      } catch {
        if (cancelled) return;
        setJobsites(MOCK.jobsites);
        setBeaconAssets(MOCK.beaconAssets);
        setMode("mock");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { mode, jobsites, beaconAssets, setBeaconAssets };
}

// -------------------------------------------------
// Settings
// -------------------------------------------------

function ThemeToggle({ themeKey, setThemeKey, theme }: any) {
  const isDark = themeKey === "dark";
  return (
    <Button
      variant="secondary"
      onClick={() => setThemeKey(isDark ? "light" : "dark")}
      style={{ width: "100%", justifyContent: "flex-start", borderColor: theme.border }}
    >
      {isDark ? <Sun className="h-4 w-4" style={{ color: theme.accent }} /> : <Moon className="h-4 w-4" style={{ color: theme.accent }} />}
      {isDark ? "Light theme" : "Dark theme"}
    </Button>
  );
}

function SettingsModal({ mode, importFile, setImportFile, importResult, onImport, onClose, theme, themeKey, setThemeKey }: any) {
  return (
    <ErrorBoundary>
    <ThemeVars theme={theme}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          background: "rgba(0,0,0,0.45)",
        }}
      >
        <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 390 }} className="settings-font">
          <SurfaceCard
            theme={theme}
            style={{
              background: themeKey === "dark" ? "#242424" : "#f7f7f7",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 950, color: theme.text }}>Settings</div>
              <Button variant="secondary" onClick={onClose} style={{ borderColor: theme.border }}>
                Close
              </Button>
            </div>

            <Separator />

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontWeight: 950, color: theme.text }}>Appearance</div>
              <ThemeToggle themeKey={themeKey} setThemeKey={setThemeKey} theme={theme} />
            </div>

            <Separator />

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontWeight: 950, color: theme.text }}>Import beacon assets (CSV)</div>
              <Input type="file" accept=".csv,text/csv" onChange={(e: any) => setImportFile(e.target.files?.[0] || null)} />
              <Button onClick={onImport} disabled={mode !== "backend"}>
                Import
              </Button>
              {importResult ? <div style={{ fontSize: 13, color: importResult.ok ? theme.text : "#dc2626" }}>{importResult.message}</div> : null}
            </div>

            <Separator />

            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: theme.muted }}>
              <div style={{ fontWeight: 950, color: theme.text }}>About</div>
              <div style={{ color: theme.text }}>Virtual Toolbox</div>
              <div>Beacon Finder UUID: {ORG_UUID}</div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </ThemeVars>
    </ErrorBoundary>
  );
}

// -------------------------------------------------
// Home (Toolbox)
// -------------------------------------------------

function Tile({ title, subtitle, icon, onClick, theme }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${theme.border}`,
        background: theme.surface,
        borderRadius: 18,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        textAlign: "left",
        cursor: "pointer",
        boxShadow: "0 10px 26px rgba(0,0,0,0.08)",
        maxWidth: "100%",
      }}
    >
      <div
        style={{
          height: 38,
          width: 38,
          borderRadius: 14,
          background: `color-mix(in srgb, ${theme.accent} 14%, ${theme.surface})`,
          border: `1px solid color-mix(in srgb, ${theme.accent} 28%, ${theme.border})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 16, fontWeight: 950, color: theme.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
      <div style={{ fontSize: 13, color: theme.muted, lineHeight: 1.35 }}>{subtitle}</div>
    </button>
  );
}

function ToolboxHome({ headerBadge, onOpenBeacon, onOpenDeployment, onOpenSettings, theme }: any) {
  return (
    <PhoneFrame
      theme={theme}
      bottomBar={
        <BottomNav
          left={<div />}
          center={headerBadge}
          right={
            <Button variant="secondary" onClick={onOpenSettings} style={{ borderColor: theme.border, padding: "10px 12px" }}>
              <SettingsIcon style={{ height: 16, width: 16, color: theme.accent }} /> Settings
            </Button>
          }
        />
      }
    >
      <Header title="Virtual Toolbox" subtitle="Choose a tool." theme={theme} leftGlyph={null} />

      <SurfaceCard theme={theme} style={{ padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Tile
            title="Beacon Finder"
            subtitle="Find nearby assets and navigate by distance/trend."
            icon={<Radar className="h-5 w-5" style={{ color: theme.accent }} />}
            onClick={onOpenBeacon}
            theme={theme}
          />
          <Tile
            title="Asset Deployment"
            subtitle="Scan assets and attach them to tickets/status."
            icon={<ScanLine className="h-5 w-5" style={{ color: theme.accent }} />}
            onClick={onOpenDeployment}
            theme={theme}
          />
        </div>
      </SurfaceCard>

      <div style={{ fontSize: 12, color: theme.muted }}>
        Prototype note: Beacon Finder simulates beacon ranging. Asset Deployment simulates barcode scans (with optional camera scan where supported).
      </div>
    </PhoneFrame>
  );
}

// -------------------------------------------------
// Beacon Finder – Home (project select)
// -------------------------------------------------

function BeaconHome({ headerBadge, jobsites, selectedMajor, setSelectedMajor, onEnter, onGoToolbox, onOpenSettings, theme }: any) {
  const canEnter = selectedMajor && selectedMajor !== "";

  return (
    <PhoneFrame
      theme={theme}
      bottomBar={
        <BottomNav
          left={
            <Button variant="secondary" onClick={onGoToolbox} style={{ borderColor: theme.border, padding: "10px 12px" }}>
              <Home className="h-4 w-4" style={{ color: theme.accent }} /> Home
            </Button>
          }
          center={headerBadge}
          right={
            <Button variant="secondary" onClick={onOpenSettings} style={{ borderColor: theme.border, padding: "10px 12px" }}>
              <SettingsIcon style={{ height: 16, width: 16, color: theme.accent }} /> Settings
            </Button>
          }
        />
      }
    >
      <Header title="Beacon Finder" subtitle="Select a jobsite/project to find nearby assets." theme={theme} />

      <SurfaceCard theme={theme}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 950, color: theme.text }}>Project / Jobsite</div>

          <Select value={selectedMajor} onValueChange={setSelectedMajor}>
            <SelectItem value="">Select location…</SelectItem>
            {jobsites.map((j: any) => (
              <SelectItem key={j.major} value={String(j.major)}>
                {j.name} (Major {j.major})
              </SelectItem>
            ))}
          </Select>

          <div style={{ fontSize: 12, color: theme.muted }}>You can import assets in Settings before entering a project.</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button onClick={() => onEnter(selectedMajor)} disabled={!canEnter}>
              Enter project
            </Button>
            <Button variant="secondary" onClick={() => onEnter("all")} style={{ borderColor: theme.border }}>
              View all
            </Button>
          </div>
        </div>
      </SurfaceCard>
    </PhoneFrame>
  );
}

// -------------------------------------------------
// Beacon Finder – Nearby + Find
// -------------------------------------------------

function NearbyList({ rows, jobsiteName, onFind, theme }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.length === 0 ? <div style={{ fontSize: 13, color: theme.muted }}>No assets match the current filter.</div> : null}

      {rows.map((row: any) => {
        const feet = ft(row.meters);
        const st = stabilityLabel(row.madMeters);
        const tr = trendLabel(row.deltaMeters);
        const TrendIcon = tr.Icon;

        return (
          <SurfaceCard key={row.key} theme={theme}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
                <div
                  style={{
                    marginTop: 2,
                    borderRadius: 16,
                    padding: 10,
                    border: `1px solid ${theme.border}`,
                    background: `color-mix(in srgb, ${theme.accent} 10%, ${theme.surface})`,
                    flex: "0 0 auto",
                  }}
                >
                  <AvatarIcon assetType={row.asset.assetType} theme={theme} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <div style={{ fontWeight: 950, color: theme.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.asset.displayName}
                    </div>
                    <Badge variant={st.variant}>{st.label}</Badge>
                    {row.fresh ? <Badge>Live</Badge> : <Badge variant="secondary">Out of range</Badge>}
                  </div>

                  <div style={{ fontSize: 13, color: theme.muted }}>
                    {jobsiteName(row.asset.jobsiteMajor)}{row.asset.locationHint ? ` • ${row.asset.locationHint}` : ""}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, alignItems: "center" }}>
                    <div style={{ fontWeight: 950, color: theme.text }}>
                      Distance: {row.fresh ? (feet == null ? "—" : `${Math.round(feet)} ft`) : "Unknown"}
                    </div>
                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center", color: theme.muted }}>
                      <TrendIcon className="h-4 w-4" style={{ color: theme.accent }} /> {row.fresh ? tr.label : "Offline"}
                    </div>
                    <div style={{ color: theme.muted }}>Last seen: {row.age == null ? "Never" : `${formatAge(row.age)} ago`}</div>
                  </div>

                  <div style={{ fontSize: 12, color: theme.muted }}>
                    Beacon: major {row.beacon.major} • minor {row.beacon.minor} • RSSI {row.rssi ?? "—"} dBm
                  </div>
                </div>
              </div>

              <Button onClick={() => onFind(row)} style={{ flex: "0 0 auto" }}>
                <ArrowRight className="h-4 w-4" /> Find
              </Button>
            </div>
          </SurfaceCard>
        );
      })}
    </div>
  );
}

function FindScreen({ selectedRow, selectedState, onBack, simTargetKey, setSimTargetKey, theme }: any) {
  const showUnknown = !selectedRow?.fresh;

  // Random target geolocation within 150 ft of first fix (demo)
  const [geoPos, setGeoPos] = useState<any>(null);
  const [geoTarget, setGeoTarget] = useState<any>(null);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [geoLastDist, setGeoLastDist] = useState<number | null>(null);
  const [geoDelta, setGeoDelta] = useState<number | null>(null);

  useEffect(() => {
    setGeoErr(null);
    setGeoPos(null);
    setGeoTarget(null);
    setGeoLastDist(null);
    setGeoDelta(null);

    if (showUnknown) return;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoErr("Geolocation not available in this environment.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, ts: p.timestamp };
        setGeoPos(next);
        setGeoErr(null);

        setGeoTarget((prev: any) => {
          if (prev) return prev;
          const maxMeters = 45.72; // 150 ft
          const R = 6371000;
          const bearing = Math.random() * Math.PI * 2;
          const dist = Math.random() * maxMeters;

          const lat1 = (next.lat * Math.PI) / 180;
          const lon1 = (next.lon * Math.PI) / 180;

          const lat2 = Math.asin(Math.sin(lat1) * Math.cos(dist / R) + Math.cos(lat1) * Math.sin(dist / R) * Math.cos(bearing));
          const lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(dist / R) * Math.cos(lat1), Math.cos(dist / R) - Math.sin(lat1) * Math.sin(lat2));

          return { lat: (lat2 * 180) / Math.PI, lon: (lon2 * 180) / Math.PI, ts: nowMs() };
        });
      },
      (e) => setGeoErr(e?.message || "Location permission denied or unavailable."),
      { enableHighAccuracy: true, maximumAge: 500, timeout: 15000 }
    );

    return () => {
      try {
        navigator.geolocation.clearWatch(watchId);
      } catch {
        // ignore
      }
    };
  }, [selectedRow?.key, showUnknown]);

  const geoDist = useMemo(() => {
    const d = haversineMeters(geoPos, geoTarget);
    return d == null ? null : d;
  }, [geoPos, geoTarget]);

  useEffect(() => {
    if (geoDist == null) return;
    if (geoLastDist == null) {
      setGeoLastDist(geoDist);
      setGeoDelta(null);
      return;
    }
    setGeoDelta(geoDist - geoLastDist);
    setGeoLastDist(geoDist);
  }, [geoDist]);

  const geoTrend = trendLabel(geoDelta);
  const GeoTrendIcon = geoTrend.Icon;

  const selectedFeet = selectedState ? ft(selectedState.emaMeters) : null;
  const st = stabilityLabel(selectedState?.madMeters ?? null);
  const tr = trendLabel(selectedState?.deltaMeters ?? null);
  const TrendIcon = tr.Icon;
  const geoFeet = geoDist == null ? null : ft(geoDist);

  return (
    <SurfaceCard theme={theme}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedRow.asset.displayName}</div>
          <div style={{ fontSize: 13, color: theme.muted }}>Beacon: major {selectedRow.beacon.major} • minor {selectedRow.beacon.minor}</div>
        </div>
        <Button variant="secondary" onClick={onBack} style={{ borderColor: theme.border }}>
          Back
        </Button>
      </div>

      <Separator />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <Badge variant={st.variant}>{st.label}</Badge>
          <Badge variant="secondary" style={{ display: "inline-flex", gap: 6 }}>
            <TrendIcon className="h-4 w-4" style={{ color: theme.accent }} /> {tr.label}
          </Badge>
        </div>

        <div style={{ borderRadius: 18, padding: 16, border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: 12, color: theme.muted }}>Estimated distance</div>
          <div style={{ fontSize: 40, fontWeight: 950, letterSpacing: -0.8 }}>
            {showUnknown
              ? "Distance unknown"
              : geoFeet == null
              ? selectedFeet == null
                ? "—"
                : `${Math.round(selectedFeet)} ft`
              : `${Math.round(geoFeet)} ft`}
          </div>

          {showUnknown ? (
            <div style={{ marginTop: 10, fontSize: 12, color: theme.muted }}>Out of range/offline — no distance estimate available.</div>
          ) : (
            <>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: theme.muted, alignItems: "center" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <GeoTrendIcon className="h-4 w-4" style={{ color: theme.accent }} /> {geoTrend.label}
                </div>
                <div>Accuracy: {geoPos?.acc ? `±${Math.round(geoPos.acc)}m` : "—"}</div>
              </div>
              {geoErr ? <div style={{ marginTop: 8, fontSize: 12, color: "#dc2626" }}>{geoErr}</div> : null}
              <div style={{ marginTop: 8, fontSize: 12, color: theme.muted }}>
                Demo note: a target location is randomly generated within 150 ft of your first GPS fix for this Find session.
              </div>
            </>
          )}

          <div style={{ marginTop: 8, fontSize: 12, color: theme.muted }}>
            RSSI: {selectedState?.lastRssi ?? "—"} dBm • Updated {selectedState ? formatAge(nowMs() - selectedState.lastSeenMs) : "—"} ago
          </div>
        </div>

        <div style={{ borderRadius: 18, padding: 14, background: theme.surface, border: `1px solid ${theme.border}` }}>
          <div style={{ fontWeight: 950, color: theme.text }}>Guidance</div>
          <div style={{ fontSize: 13, marginTop: 6, color: theme.muted }}>
            {st.label === "Unstable"
              ? "Signal is unstable. Step away from rack faces/metal surfaces, hold the phone higher, and move 10–15 ft to re-sample."
              : "Walk steadily and watch the trend. If distance increases for ~5–10 seconds, turn ~45° and try again."}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Button variant={simTargetKey === selectedRow.key ? "default" : "secondary"} onClick={() => setSimTargetKey(selectedRow.key)}>
            <Radar className="h-4 w-4" style={{ color: simTargetKey === selectedRow.key ? theme.bg : theme.accent }} /> Simulate toward
          </Button>
          <Button variant={simTargetKey == null ? "default" : "secondary"} onClick={() => setSimTargetKey(null)}>
            <RefreshCw className="h-4 w-4" style={{ color: simTargetKey == null ? theme.bg : theme.accent }} /> Simulate idle
          </Button>
        </div>
      </div>
    </SurfaceCard>
  );
}

function CommissionScreen({ jobsites, commMajor, setCommMajor, commMinor, setCommMinor, commType, setCommType, commTag, setCommTag, onSave, theme }: any) {
  return (
    <SurfaceCard theme={theme}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <QrCode className="h-5 w-5" style={{ color: theme.accent }} />
        <div style={{ fontSize: 16, fontWeight: 950, color: theme.text }}>Commission a beacon to an asset</div>
      </div>

      <div style={{ fontSize: 13, marginTop: 6, color: theme.muted }}>Scan beacon, enter asset type/tag, save mapping.</div>

      <Separator />

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 950, color: theme.text }}>Jobsite (Major)</div>
          <Select value={String(commMajor)} onValueChange={setCommMajor}>
            {jobsites.map((j: any) => (
              <SelectItem key={j.major} value={String(j.major)}>
                {j.name} (Major {j.major})
              </SelectItem>
            ))}
          </Select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 950, color: theme.text }}>Beacon Minor</div>
          <Input value={commMinor} onChange={(e: any) => setCommMinor(e.target.value)} placeholder="e.g., 777" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 950, color: theme.text }}>Asset type</div>
          <Input value={commType} onChange={(e: any) => setCommType(e.target.value)} placeholder="Access Point" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 950, color: theme.text }}>Asset tag</div>
          <Input value={commTag} onChange={(e: any) => setCommTag(e.target.value)} placeholder="C1234" />
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12, alignItems: "center" }}>
        <Button onClick={onSave} disabled={!String(commMinor).trim()}>
          Save assignment
        </Button>
        <Badge variant="secondary">UUID fixed (org-wide)</Badge>
      </div>

      <div style={{ fontSize: 12, marginTop: 8, color: theme.muted }}>UUID used: {ORG_UUID}</div>
    </SurfaceCard>
  );
}

function BeaconApp({ headerBadge, jobsites, jobsiteMajor, setJobsiteMajor, q, setQ, tab, setTab, simRunning, setSimRunning, onHome, onOpenSettings, rows, onFind, selectedRow, selectedState, onBackFromFind, simTargetKey, setSimTargetKey, commissionProps, jobsiteName, theme }: any) {
  return (
    <PhoneFrame
      theme={theme}
      bottomBar={
        <BottomNav
          left={
            <Button variant="secondary" onClick={onHome} style={{ borderColor: theme.border, padding: "10px 12px" }}>
              <Home className="h-4 w-4" style={{ color: theme.accent }} /> Home
            </Button>
          }
          center={
            <Button
              variant={simRunning ? "default" : "secondary"}
              onClick={() => setSimRunning((v: boolean) => !v)}
              style={{ borderColor: theme.border, padding: "10px 12px" }}
              title="Toggle simulation"
            >
              <RefreshCw className="h-4 w-4" style={{ color: simRunning ? theme.bg : theme.accent }} />
              {simRunning ? "Sim on" : "Sim off"}
            </Button>
          }
          right={
            <Button variant="secondary" onClick={onOpenSettings} style={{ borderColor: theme.border, padding: "10px 12px" }}>
              <SettingsIcon style={{ height: 16, width: 16, color: theme.accent }} /> Settings
            </Button>
          }
        />
      }
    >
      <Header title="Beacon Finder" subtitle="Nearby assets → Find view with distance + trend + stability." theme={theme} />

      <SurfaceCard theme={theme} style={{ padding: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="nearby">Nearby</TabsTrigger>
              <TabsTrigger value="commission">Commission</TabsTrigger>
              <TabsTrigger value="find" disabled={!selectedRow}>
                Find
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <Search className="h-4 w-4" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: theme.muted }} />
              <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Search: asset tag, type, name, minor…" style={{ paddingLeft: 36 }} />
            </div>

            <Select value={String(jobsiteMajor)} onValueChange={setJobsiteMajor}>
              <SelectItem value="all">All jobsites</SelectItem>
              {jobsites.map((j: any) => (
                <SelectItem key={j.major} value={String(j.major)}>
                  {j.name}
                </SelectItem>
              ))}
            </Select>
          </div>

          <Separator />

          {tab === "nearby" ? <NearbyList rows={rows} jobsiteName={jobsiteName} onFind={onFind} theme={theme} /> : null}

          {tab === "find" && selectedRow ? (
            <FindScreen selectedRow={selectedRow} selectedState={selectedState} onBack={onBackFromFind} simTargetKey={simTargetKey} setSimTargetKey={setSimTargetKey} theme={theme} />
          ) : null}

          {tab === "commission" ? <CommissionScreen jobsites={jobsites} {...commissionProps} theme={theme} /> : null}
        </div>
      </SurfaceCard>

      <div style={{ fontSize: 12, color: theme.muted }}>Note: Web prototype only. Mobile app would use CoreLocation/CoreMotion.</div>
      <div style={{ display: "none" }}>{headerBadge}</div>
    </PhoneFrame>
  );
}

// -------------------------------------------------
// Asset Deployment
// -------------------------------------------------

function AssetDeployment({ headerBadge, onHome, onOpenSettings, mode, theme }: any) {
  const [ticket, setTicket] = useState("SR-20498");
  const [scanInput, setScanInput] = useState("");
  const [scanned, setScanned] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("In Use");
  const [location, setLocation] = useState<LocationOpt>("Jobsite Location");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);

  // Camera scanning (BarcodeDetector best-effort)
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        (videoRef.current as any).srcObject = null;
      } catch {
        // ignore
      }
    }
  }, []);

  const openCamera = useCallback(() => {
    setCameraError(null);
    if (typeof window === "undefined") {
      setCameraError("Camera is not available in this environment.");
      return;
    }
    if (!(navigator as any).mediaDevices?.getUserMedia) {
      setCameraError("Camera API not supported in this browser.");
      setCameraOpen(true);
      return;
    }
    setCameraOpen(true);
  }, []);

  useEffect(() => {
    if (!cameraOpen) {
      stopCamera();
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          (videoRef.current as any).srcObject = stream;
          await videoRef.current.play();
        }

        const hasDetector = typeof (window as any).BarcodeDetector !== "undefined";
        if (!hasDetector) {
          setCameraError("BarcodeDetector is not available in this browser (iOS Safari often blocks it). Use manual entry for now.");
          return;
        }

        const formats = ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "itf", "pdf417", "data_matrix"];
        const detector = new (window as any).BarcodeDetector({ formats });

        const tick = async () => {
          if (cancelled) return;
          const v = videoRef.current;
          if (!v) return;
          try {
            const barcodes = await detector.detect(v);
            if (barcodes?.length) {
              const raw = (barcodes[0].rawValue || "").trim();
              if (raw) {
                setScanned((prev) => (prev.includes(raw) ? prev : [raw, ...prev]));
                setScanInput("");
                setCameraOpen(false);
                return;
              }
            }
          } catch {
            // ignore
          }
          rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
      } catch (e: any) {
        setCameraError(e?.message || "Unable to access camera (permission denied?).");
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [cameraOpen, stopCamera]);

  const addScan = useCallback(() => {
    const v = scanInput.trim();
    if (!v) return;
    setScanned((prev) => (prev.includes(v) ? prev : [v, ...prev]));
    setScanInput("");
  }, [scanInput]);

  const removeScan = useCallback((code: string) => {
    setScanned((prev) => prev.filter((x) => x !== code));
  }, []);

  const lookupTicket = useCallback(async () => {
    setSubmitResult(null);

    if (!ticket.trim()) {
      setLookupResult({ ok: false, message: "Enter a ticket number first." });
      return;
    }

    if (mode === "backend") {
      try {
        const r = await fetch(`${API_BASE}/api/tickets/${encodeURIComponent(ticket.trim())}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Ticket lookup failed");
        setLookupResult({ ok: true, message: `Ticket found. Assets attached: ${j.assets?.length ?? 0}.`, assets: j.assets || [] });
      } catch (e: any) {
        setLookupResult({ ok: false, message: String(e?.message || e) });
      }
      return;
    }

    const assets = (MOCK.ticketDB as any)[ticket.trim()] ?? null;
    if (assets == null) {
      setLookupResult({ ok: false, message: "Ticket not found (mock). Try INC-10001 or SR-20498." });
      return;
    }
    setLookupResult({ ok: true, message: `Ticket found (mock). Assets attached: ${assets.length}.`, assets });
  }, [ticket, mode]);

  const submit = useCallback(async () => {
    setSubmitResult(null);

    const t = ticket.trim();
    if (!t) {
      setSubmitResult({ ok: false, message: "Ticket number is required." });
      return;
    }
    if (scanned.length === 0) {
      setSubmitResult({ ok: false, message: "Scan at least one asset barcode." });
      return;
    }

    if (mode === "backend") {
      try {
        const r = await fetch(`${API_BASE}/api/asset-movements`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ticketNumber: t, barcodes: scanned, status, location }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Submission failed");
        setSubmitResult({ ok: true, message: `Submitted. Attached ${j.attached ?? scanned.length} assets and updated status.` });
      } catch (e: any) {
        setSubmitResult({ ok: false, message: String(e?.message || e) });
      }
      return;
    }

    const existing = (MOCK.ticketDB as any)[t];
    if (existing == null) {
      setSubmitResult({ ok: false, message: "Ticket not found (mock)." });
      return;
    }

    const merged = Array.from(new Set([...(existing || []), ...scanned]));
    (MOCK.ticketDB as any)[t] = merged;

    setSubmitResult({ ok: true, message: `Submitted (mock). Ticket ${t} now has ${merged.length} asset(s). Status → ${status}. Location → ${location}.` });
    setLookupResult({ ok: true, message: `Ticket found (mock). Assets attached: ${merged.length}.`, assets: merged });
  }, [ticket, scanned, status, location, mode]);

  return (
    <>
      <PhoneFrame
        theme={theme}
        bottomBar={
          <BottomNav
            left={
              <Button variant="secondary" onClick={onHome} style={{ borderColor: theme.border, padding: "10px 12px" }}>
                <Home className="h-4 w-4" style={{ color: theme.accent }} /> Home
              </Button>
            }
            center={headerBadge}
            right={
              <Button variant="secondary" onClick={onOpenSettings} style={{ borderColor: theme.border, padding: "10px 12px" }}>
                <SettingsIcon style={{ height: 16, width: 16, color: theme.accent }} /> Settings
              </Button>
            }
          />
        }
      >
        <Header title="Asset Deployment" subtitle="Deploy assets by scanning barcodes and updating ticket, status, and location." theme={theme} />

        <SurfaceCard theme={theme}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ClipboardList className="h-5 w-5" style={{ color: theme.accent }} />
              <div style={{ fontWeight: 950, color: theme.text }}>Ticket</div>
            </div>

            <Input value={ticket} onChange={(e: any) => setTicket(e.target.value)} placeholder="e.g., INC-10001" />

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Button variant="secondary" onClick={lookupTicket} style={{ borderColor: theme.border }}>
                Check ticket
              </Button>
            </div>

            {lookupResult ? <div style={{ fontSize: 13, color: lookupResult.ok ? theme.text : "#dc2626" }}>{lookupResult.message}</div> : null}

            <Separator style={{ margin: "8px 0" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ScanLine className="h-5 w-5" style={{ color: theme.accent }} />
              <div style={{ fontWeight: 950, color: theme.text }}>Scan assets</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, color: theme.muted }}>
                Use <span style={{ color: theme.text, fontWeight: 950 }}>Scan with camera</span>, or type a barcode and press Add.
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Input value={scanInput} onChange={(e: any) => setScanInput(e.target.value)} placeholder="Barcode" />
                </div>
                <Button onClick={addScan} variant="secondary" style={{ borderColor: theme.border, padding: "10px 12px" }}>
                  <Package className="h-4 w-4" /> Add
                </Button>
              </div>

              <Button onClick={openCamera} style={{ justifyContent: "flex-start" }}>
                <ScanLine className="h-4 w-4" style={{ color: theme.bg }} /> Scan with camera
              </Button>
            </div>

            {scanned.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 950, color: theme.text }}>Scanned ({scanned.length})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {scanned.map((code) => (
                    <div
                      key={code}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        borderRadius: 14,
                        padding: "10px 12px",
                        border: `1px solid ${theme.border}`,
                        maxWidth: "100%",
                      }}
                    >
                      <div style={{ fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{code}</div>
                      <Button variant="secondary" onClick={() => removeScan(code)} style={{ borderColor: theme.border, padding: "10px 12px" }}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: theme.muted }}>No scanned assets yet.</div>
            )}

            <Separator style={{ margin: "8px 0" }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 950, color: theme.text }}>Set status</div>
                <Select value={status} onValueChange={setStatus as any}>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 950, color: theme.text }}>Set location</div>
                <Select value={location} onValueChange={setLocation as any}>
                  {LOCATION_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <Button onClick={submit}>Submit</Button>
              <Badge variant="secondary">Will attach assets to ticket if missing</Badge>
            </div>

            {submitResult ? <div style={{ fontSize: 13, color: submitResult.ok ? theme.text : "#dc2626" }}>{submitResult.message}</div> : null}

            <div style={{ fontSize: 12, color: theme.muted }}>
              Backend note: the real implementation would validate the ticket in your ticketing system and then update asset records.
            </div>
          </div>
        </SurfaceCard>
      </PhoneFrame>

      {cameraOpen ? (
        <ThemeVars theme={theme}>
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setCameraOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9998,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              background: "rgba(0,0,0,0.55)",
              color: theme.text,
            }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 390 }}>
              <SurfaceCard theme={theme} style={{ padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 950, color: theme.text }}>Scan barcode</div>
                  <Button variant="secondary" onClick={() => setCameraOpen(false)} style={{ borderColor: theme.border }}>
                    Close
                  </Button>
                </div>

                <div style={{ fontSize: 12, color: theme.muted, marginTop: 8 }}>Point the camera at the barcode. The first detected code will be added.</div>

                <div style={{ marginTop: 12, borderRadius: 16, overflow: "hidden", border: `1px solid ${theme.border}` }}>
                  <video ref={videoRef} playsInline muted style={{ width: "100%", height: 360, objectFit: "cover", background: "#000" }} />
                </div>

                {cameraError ? (
                  <div style={{ marginTop: 10, fontSize: 13, color: theme.muted }}>{cameraError}</div>
                ) : (
                  <div style={{ marginTop: 10, fontSize: 13, color: theme.muted }}>If nothing scans, try more light and move closer/farther.</div>
                )}
              </SurfaceCard>
            </div>
          </div>
        </ThemeVars>
      ) : null}
    </>
  );
}

// -------------------------------------------------
// Main
// -------------------------------------------------

export default function VirtualToolboxPrototype() {
  const { mode, jobsites, beaconAssets, setBeaconAssets } = useBackendOrMock();

  const [themeKey, setThemeKey] = useState<"dark" | "light">(() => {
    try {
      const v = localStorage.getItem("fs_toolbox_theme");
      return v === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("fs_toolbox_theme", themeKey);
    } catch {
      // ignore
    }
  }, [themeKey]);

  const theme = (THEMES as any)[themeKey];

  const headerBadge =
    mode === "checking" ? (
      <Badge variant="secondary">Checking backend…</Badge>
    ) : mode === "backend" ? (
      <Badge>Backend connected</Badge>
    ) : (
      <Badge variant="secondary">Mock data</Badge>
    );

  const [route, setRoute] = useState<Route>("toolbox");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [importFile, setImportFile] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const [beaconHomeSelectedMajor, setBeaconHomeSelectedMajor] = useState("");
  const [beaconTab, setBeaconTab] = useState("nearby");
  const [beaconJobsiteMajor, setBeaconJobsiteMajor] = useState<string>("all");
  const [beaconQ, setBeaconQ] = useState("");
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const [ranged, setRanged] = useState<Map<string, RangeState>>(() => new Map());

  const [simRunning, setSimRunning] = useState(true);
  const [simTargetKey, setSimTargetKey] = useState<string | null>(null);
  const simStateRef = useRef<Record<string, { meters: number }>>({});

  const goToolbox = useCallback(() => {
    setRoute("toolbox");
    setSelectedRow(null);
    setBeaconTab("nearby");
    setSimTargetKey(null);
  }, []);

  const openBeacon = useCallback(() => {
    setRoute("beacon_home");
  }, []);

  const openDeployment = useCallback(() => {
    setRoute("deployment");
  }, []);

  const refreshBeaconAssets = useCallback(
    async (majorFilter?: string) => {
      if (mode !== "backend") return;
      const major = majorFilter ?? beaconJobsiteMajor;
      const url = major === "all" ? `${API_BASE}/api/assets` : `${API_BASE}/api/assets?major=${encodeURIComponent(String(major))}`;
      const a = await (await fetch(url)).json();
      setBeaconAssets(a.assets || []);
    },
    [mode, beaconJobsiteMajor, setBeaconAssets]
  );

  const importBeaconAssetsCsv = useCallback(async () => {
    setImportResult(null);

    if (mode !== "backend") {
      setImportResult({ ok: false, message: "Import requires backend mode." });
      return;
    }
    if (!importFile) {
      setImportResult({ ok: false, message: "Select a CSV file first." });
      return;
    }

    try {
      const fd = new FormData();
      fd.append("file", importFile);
      const r = await fetch(`${API_BASE}/api/import/assets`, { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) {
        setImportResult({ ok: false, message: j?.error || "Import failed" });
        return;
      }
      setImportResult({ ok: true, message: `Imported: ${j.created} created, ${j.skipped} skipped, ${j.errors} errors.` });
      await refreshBeaconAssets();
    } catch (e: any) {
      setImportResult({ ok: false, message: String(e?.message || e) });
    }
  }, [mode, importFile, refreshBeaconAssets]);

  const enterBeaconProject = useCallback((major: string) => {
    setBeaconJobsiteMajor(String(major));
    setRoute("beacon_app");
  }, []);

  const filteredBeaconAssets = useMemo(() => {
    const needle = beaconQ.trim().toLowerCase();
    return beaconAssets
      .filter((a: any) => (beaconJobsiteMajor === "all" ? true : a.jobsiteMajor === Number(beaconJobsiteMajor)))
      .filter((a: any) => {
        if (!needle) return true;
        return (
          (a.displayName || "").toLowerCase().includes(needle) ||
          (a.assetTag || "").toLowerCase().includes(needle) ||
          (a.assetType || "").toLowerCase().includes(needle) ||
          String(a.beacon?.minor || "").includes(needle)
        );
      });
  }, [beaconAssets, beaconJobsiteMajor, beaconQ]);

  const beaconRows = useMemo(() => {
    return filteredBeaconAssets
      .map((a: any) => {
        const k = beaconKey(a.beacon);
        const s = ranged.get(k);
        const age = s ? nowMs() - s.lastSeenMs : null;
        const fresh = s ? age <= 3000 : false;
        return {
          asset: a,
          beacon: a.beacon,
          key: k,
          fresh,
          age,
          meters: s?.emaMeters ?? null,
          madMeters: s?.madMeters ?? null,
          deltaMeters: s?.deltaMeters ?? null,
          rssi: s?.lastRssi ?? null,
        };
      })
      .sort((x: any, y: any) => {
        if (x.fresh !== y.fresh) return x.fresh ? -1 : 1;
        const dx = x.meters ?? 1e9;
        const dy = y.meters ?? 1e9;
        if (dx !== dy) return dx - dy;
        return (x.asset.displayName || "").localeCompare(y.asset.displayName || "");
      });
  }, [filteredBeaconAssets, ranged]);

  const ingestObservation = useCallback((key: string, metersVal: number, rssi: number) => {
    setRanged((prev) => {
      const next = new Map(prev);
      const curr: RangeState =
        next.get(key) ||
        ({
          samples: [],
          lastSeenMs: 0,
          emaMeters: null,
          madMeters: null,
          deltaMeters: null,
          lastEmaMeters: null,
          lastRssi: null,
        } as RangeState);

      const samples = [...curr.samples, metersVal].slice(-18);
      const med = median(samples) as number;
      const alpha = 0.25;
      const ema = curr.emaMeters == null ? med : alpha * med + (1 - alpha) * curr.emaMeters;
      const m = mad(samples);
      const delta = curr.lastEmaMeters == null ? null : ema - curr.lastEmaMeters;

      next.set(key, {
        ...curr,
        samples,
        lastSeenMs: nowMs(),
        lastRssi: rssi,
        lastEmaMeters: ema,
        emaMeters: ema,
        madMeters: m,
        deltaMeters: delta,
      });

      return next;
    });
  }, []);

  useEffect(() => {
    if (!simRunning) return;
    if (route !== "beacon_app") return;

    const id = setInterval(() => {
      const audible = beaconAssets
        .filter((a: any) => (beaconJobsiteMajor === "all" ? true : a.jobsiteMajor === Number(beaconJobsiteMajor)))
        .filter((a: any) => a.simulate !== false)
        .slice(0, 12);

      for (const a of audible) {
        const k = beaconKey(a.beacon);
        const st = (simStateRef.current[k] ||= { meters: 6 + Math.random() * 25 });

        const toward = simTargetKey === k;
        const drift = toward ? -0.35 : 0.05;
        st.meters = clamp(st.meters + drift + (Math.random() - 0.5) * 0.6, 0.8, 35);

        const rssi = Math.round(-45 - 18 * Math.log10(st.meters) + (Math.random() - 0.5) * 10);
        ingestObservation(k, st.meters, rssi);
      }
    }, 650);

    return () => clearInterval(id);
  }, [simRunning, route, beaconAssets, beaconJobsiteMajor, simTargetKey, ingestObservation]);

  const jobsiteName = useCallback(
    (major: number) => {
      const j = jobsites.find((x: any) => x.major === major);
      return j ? j.name : `Jobsite ${major}`;
    },
    [jobsites]
  );

  const onFind = useCallback((row: any) => {
    setSelectedRow(row);
    setBeaconTab("find");
    setSimTargetKey(row.key);
  }, []);

  const onBackFromFind = useCallback(() => {
    setSelectedRow(null);
    setBeaconTab("nearby");
    setSimTargetKey(null);
  }, []);

  const [commMinor, setCommMinor] = useState("");
  const [commMajor, setCommMajor] = useState("23456");
  const [commType, setCommType] = useState("Access Point");
  const [commTag, setCommTag] = useState("C1234");

  const commission = useCallback(async () => {
    const minor = Number(commMinor);
    const major = Number(commMajor);
    if (!minor || !major) return;

    const displayName = `${commType} – ${commTag}`;
    const beacon = { uuid: ORG_UUID, major, minor };

    if (mode === "backend") {
      await fetch(`${API_BASE}/api/assets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, assetType: commType, assetTag: commTag, jobsiteMajor: major, locationHint: "", beacon }),
      });
      await refreshBeaconAssets();
      setBeaconTab("nearby");
      return;
    }

    setBeaconAssets((prev: any[]) => [
      { id: `m${Math.random().toString(16).slice(2)}`, displayName, assetType: commType, assetTag: commTag, jobsiteMajor: major, locationHint: "", beacon },
      ...prev,
    ]);
    setBeaconTab("nearby");
  }, [commMinor, commMajor, commType, commTag, mode, refreshBeaconAssets, setBeaconAssets]);

  const selectedState = selectedRow ? ranged.get(selectedRow.key) : null;

  const settingsPanel = settingsOpen ? (
    <SettingsModal
      mode={mode}
      importFile={importFile}
      setImportFile={setImportFile}
      importResult={importResult}
      onImport={importBeaconAssetsCsv}
      onClose={() => setSettingsOpen(false)}
      theme={theme}
      themeKey={themeKey}
      setThemeKey={setThemeKey}
    />
  ) : null;

  return (
    <ThemeVars theme={theme}>
      <GlobalStyles themeKey={themeKey} theme={theme} />

      {route === "toolbox" ? (
        <>
          <ToolboxHome headerBadge={headerBadge} onOpenBeacon={openBeacon} onOpenDeployment={openDeployment} onOpenSettings={() => setSettingsOpen(true)} theme={theme} />
          {settingsPanel}
        </>
      ) : null}

      {route === "beacon_home" ? (
        <>
          <BeaconHome
            headerBadge={headerBadge}
            jobsites={jobsites}
            selectedMajor={beaconHomeSelectedMajor}
            setSelectedMajor={setBeaconHomeSelectedMajor}
            onEnter={enterBeaconProject}
            onGoToolbox={goToolbox}
            onOpenSettings={() => setSettingsOpen(true)}
            theme={theme}
          />
          {settingsPanel}
        </>
      ) : null}

      {route === "deployment" ? (
        <>
          <AssetDeployment headerBadge={headerBadge} onHome={goToolbox} onOpenSettings={() => setSettingsOpen(true)} mode={mode} theme={theme} />
          {settingsPanel}
        </>
      ) : null}

      {route === "beacon_app" ? (
        <>
          <BeaconApp
            headerBadge={headerBadge}
            jobsites={jobsites}
            jobsiteMajor={beaconJobsiteMajor}
            setJobsiteMajor={setBeaconJobsiteMajor}
            q={beaconQ}
            setQ={setBeaconQ}
            tab={beaconTab}
            setTab={setBeaconTab}
            simRunning={simRunning}
            setSimRunning={setSimRunning}
            onHome={goToolbox}
            onOpenSettings={() => setSettingsOpen(true)}
            rows={beaconRows}
            onFind={onFind}
            selectedRow={selectedRow}
            selectedState={selectedState}
            onBackFromFind={onBackFromFind}
            simTargetKey={simTargetKey}
            setSimTargetKey={setSimTargetKey}
            commissionProps={{
              commMajor,
              setCommMajor,
              commMinor,
              setCommMinor,
              commType,
              setCommType,
              commTag,
              setCommTag,
              onSave: commission,
            }}
            jobsiteName={jobsiteName}
            theme={theme}
          />
          {settingsPanel}
        </>
      ) : null}
    </ThemeVars>
  );
}
