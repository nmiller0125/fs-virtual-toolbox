import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
  Cog as SettingsIcon,
  Home,
  MapPin,
  Moon,
  Package,
  QrCode,
  Radar,
  RefreshCw,
  ScanLine,
  Search,
  Server,
  Sun,
  Wifi,
  X,
} from "lucide-react";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error("App crashed:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
            background: "#f6f7f9",
          }}
        >
          <div style={{ maxWidth: 560, width: "100%", borderRadius: 18, padding: 16, border: "1px solid rgba(0,0,0,0.14)", background: "#fff" }}>
            <div style={{ fontWeight: 950, marginBottom: 8, fontSize: 16 }}>The app hit a runtime error.</div>
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 12 }}>Open the browser console to see the full stack trace.</div>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, margin: 0, lineHeight: 1.35 }}>{String(this.state.error?.message || this.state.error || "Unknown error")}</pre>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

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
      @supports (-webkit-touch-callout: none) {
        body { -webkit-text-size-adjust: 100%; }
      }
      .settings-font {
        font-family: ui-rounded, "SF Pro Rounded", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial;
      }
    `}</style>
  );
}

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
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            minWidth: 0,
          }}
        >
          {children}
        </div>

        {bottomBar ? <div style={{ padding: "12px 12px", borderTop: `1px solid ${theme.border}`, background: theme.bg }}>{bottomBar}</div> : null}
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
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
        minWidth: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function BottomNav({ left, center, right }: any) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, alignItems: "center", width: "100%", minWidth: 0 }}>
      <div style={{ minWidth: 0, display: "flex", justifyContent: "flex-start" }}>{left}</div>
      <div style={{ minWidth: 0, display: "flex", justifyContent: "center" }}>{center}</div>
      <div style={{ minWidth: 0, display: "flex", justifyContent: "flex-end" }}>{right}</div>
    </div>
  );
}

function AvatarIcon({ assetType, theme }: any) {
  const t = (assetType || "").toLowerCase();
  const style = { color: theme.accent };
  if (t.includes("access") || t.includes("ap")) return <Wifi style={{ height: 18, width: 18, ...style }} />;
  if (t.includes("switch") || t.includes("router")) return <Server style={{ height: 18, width: 18, ...style }} />;
  return <MapPin style={{ height: 18, width: 18, ...style }} />;
}

function useBackendOrMock() {
  const [mode, setMode] = useState<"checking" | "backend" | "mock">("checking");
  const [jobsites, setJobsites] = useState<any[]>([]);
  const [beaconAssets, setBeaconAssets] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/health`, { cache: "no-store" as any });
        if (!r.ok) throw new Error("health not ok");

        const j = await (await fetch(`${API_BASE}/api/jobsites`, { cache: "no-store" as any })).json();
        const a = await (await fetch(`${API_BASE}/api/assets`, { cache: "no-store" as any })).json();

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

function SettingsModal({ mode, importFile, setImportFile, importResult, onImport, onClose, theme, themeKey, setThemeKey }: any) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.30)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 50,
      }}
    >
      <div
        className="settings-font"
        style={{
          width: "100%",
          maxWidth: 390,
          borderRadius: 22,
          background: theme.bg === "#212121" ? "#2a2a2a" : "#f5f4f2",
          border: `1px solid ${theme.border}`,
          padding: 16,
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          color: theme.text,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <SettingsIcon style={{ height: 18, width: 18, color: theme.accent, flex: "0 0 auto" }} />
            <div style={{ fontWeight: 950, fontSize: 16, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Settings</div>
          </div>
          <Button variant="secondary" onClick={onClose} style={{ padding: "10px 12px" }}>
            Close
          </Button>
        </div>

        <Separator />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontWeight: 900 }}>Appearance</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Button variant={themeKey === "light" ? "default" : "secondary"} onClick={() => setThemeKey("light")}>
              <Sun style={{ height: 16, width: 16 }} />
              Light
            </Button>
            <Button variant={themeKey === "dark" ? "default" : "secondary"} onClick={() => setThemeKey("dark")}>
              <Moon style={{ height: 16, width: 16 }} />
              Dark
            </Button>
          </div>
        </div>

        <Separator />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontWeight: 900 }}>Import beacon assets (CSV)</div>
          <Input type="file" accept=".csv,text/csv" onChange={(e: any) => setImportFile(e.target.files?.[0] || null)} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button onClick={onImport} disabled={mode !== "backend"}>
              Import
            </Button>
            <Badge variant="secondary">UUID: {ORG_UUID}</Badge>
          </div>
          {importResult ? <div style={{ fontSize: 13, color: importResult.ok ? theme.text : "rgba(220,38,38,0.95)" }}>{String(importResult.message || "")}</div> : null}
        </div>

        <Separator />

        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: theme.muted }}>
          <div style={{ fontWeight: 900, color: theme.text }}>About</div>
          <div>Field Services – Virtual Toolbox</div>
        </div>
      </div>
    </div>
  );
}

function TileButton({ title, subtitle, icon, onClick, theme }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        borderRadius: 22,
        border: `1px solid ${theme.border}`,
        background: theme.surface,
        padding: 16,
        cursor: "pointer",
        textAlign: "left",
        boxShadow: "0 10px 26px rgba(0,0,0,0.10)",
        display: "grid",
        gridTemplateColumns: "52px 1fr",
        gap: 14,
        alignItems: "center",
        minWidth: 0,
      }}
    >
      <div
        style={{
          height: 52,
          width: 52,
          borderRadius: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "color-mix(in srgb, var(--accent) 12%, var(--surface))",
          border: "1px solid color-mix(in srgb, var(--accent) 28%, var(--border))",
          color: theme.accent,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 950, fontSize: 16, color: theme.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        <div style={{ fontSize: 12, color: theme.muted, marginTop: 3, lineHeight: 1.35 }}>{subtitle}</div>
      </div>
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
            <Button variant="secondary" onClick={onOpenSettings} style={{ padding: "10px 12px" }}>
              <SettingsIcon style={{ height: 16, width: 16, color: theme.accent }} />
              Settings
            </Button>
          }
        />
      }
    >
      <Header title="Virtual Toolbox" subtitle="Select a tool." theme={theme} leftGlyph={null} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", minWidth: 0 }}>
        <TileButton
          title="Beacon Finder"
          subtitle="List nearby assets and open a Find view." 
          icon={<Radar style={{ height: 22, width: 22 }} />}
          onClick={onOpenBeacon}
          theme={theme}
        />
        <TileButton
          title="Asset Deployment"
          subtitle="Scan barcodes and submit a deployment form." 
          icon={<ScanLine style={{ height: 22, width: 22 }} />}
          onClick={onOpenDeployment}
          theme={theme}
        />
      </div>
    </PhoneFrame>
  );
}

function BeaconHome({ headerBadge, jobsites, selectedMajor, setSelectedMajor, onEnter, onGoToolbox, onOpenSettings, theme }: any) {
  return (
    <PhoneFrame
      theme={theme}
      bottomBar={
        <BottomNav
          left={
            <Button variant="secondary" onClick={onGoToolbox} style={{ padding: "10px 12px" }}>
              <Home style={{ height: 16, width: 16, color: theme.accent }} />
              Home
            </Button>
          }
          center={headerBadge}
          right={
            <Button variant="secondary" onClick={onOpenSettings} style={{ padding: "10px 12px" }}>
              <SettingsIcon style={{ height: 16, width: 16, color: theme.accent }} />
              Settings
            </Button>
          }
        />
      }
    >
      <Header title="Beacon Finder" subtitle="Choose a project." theme={theme} />

      <SurfaceCard theme={theme}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: theme.muted }}>Project</div>
          <Select value={selectedMajor} onValueChange={setSelectedMajor}>
            <SelectItem value="">Select location</SelectItem>
            {jobsites.map((j: any) => (
              <SelectItem key={j.major} value={String(j.major)}>
                {j.name}
              </SelectItem>
            ))}
          </Select>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button onClick={() => onEnter(selectedMajor)} disabled={!selectedMajor}>
              Enter
            </Button>
            <Button variant="secondary" onClick={() => onEnter("all")}>View all</Button>
          </div>
        </div>
      </SurfaceCard>
    </PhoneFrame>
  );
}

function NearbyList({ rows, jobsiteName, onFind, theme }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
      {rows.length === 0 ? <div style={{ fontSize: 13, color: theme.muted }}>No assets match the current filter.</div> : null}
      {rows.map((row: any) => {
        const feet = ft(row.meters);
        const st = stabilityLabel(row.madMeters);
        const tr = trendLabel(row.deltaMeters);
        const TrendIcon = tr.Icon;

        return (
          <SurfaceCard key={row.key} theme={theme}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 12, minWidth: 0, flex: 1 }}>
                <div style={{ height: 38, width: 38, borderRadius: 14, border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
                  <AvatarIcon assetType={row.asset.assetType} theme={theme} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <div style={{ fontWeight: 950, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.asset.displayName}</div>
                    <Badge variant={st.variant}>{st.label}</Badge>
                    {row.fresh ? <Badge>Live</Badge> : <Badge variant="secondary">Out of range</Badge>}
                  </div>

                  <div style={{ fontSize: 12, color: theme.muted, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {jobsiteName(row.asset.jobsiteMajor)}{row.asset.locationHint ? ` • ${row.asset.locationHint}` : ""}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: 12, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: theme.text }}>Distance: {row.fresh ? (feet == null ? "Unknown" : `${Math.round(feet)} ft`) : "Unknown"}</div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: theme.muted }}>
                      <TrendIcon style={{ height: 16, width: 16, color: theme.accent }} />
                      {tr.label}
                    </div>
                    <div style={{ color: theme.muted }}>Last seen: {row.age == null ? "Never" : `${formatAge(row.age)} ago`}</div>
                  </div>
                </div>
              </div>

              <Button onClick={() => onFind(row)} style={{ flex: "0 0 auto" }}>
                <ArrowRight style={{ height: 16, width: 16 }} />
                Find
              </Button>
            </div>
          </SurfaceCard>
        );
      })}
    </div>
  );
}

function FindScreen({ selectedRow, selectedState, onBack, simTargetKey, setSimTargetKey, theme, targetGeo }: any) {
  const [geoPos, setGeoPos] = useState<any>(null);
  const [geoErr, setGeoErr] = useState<string | null>(null);

  useEffect(() => {
    setGeoErr(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoErr("Geolocation not available.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        setGeoPos({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, ts: p.timestamp });
        setGeoErr(null);
      },
      (e) => {
        setGeoErr(e?.message || "Location permission denied or unavailable.");
      },
      { enableHighAccuracy: true, maximumAge: 500, timeout: 15000 }
    );

    return () => {
      try {
        navigator.geolocation.clearWatch(watchId);
      } catch {
        // ignore
      }
    };
  }, [selectedRow?.key]);

  const st = stabilityLabel(selectedState?.madMeters ?? null);
  const tr = trendLabel(selectedState?.deltaMeters ?? null);
  const TrendIcon = tr.Icon;

  const isLive = selectedState ? nowMs() - selectedState.lastSeenMs <= 3000 : false;
  const selectedFeet = isLive ? ft(selectedState?.emaMeters ?? null) : null;

  const gpsMeters = useMemo(() => {
    if (!geoPos || !targetGeo) return null;
    return haversineMeters(geoPos, targetGeo);
  }, [geoPos, targetGeo]);

  const gpsFeet = gpsMeters == null ? null : ft(gpsMeters);

  return (
    <SurfaceCard theme={theme}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 950, fontSize: 16, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedRow.asset.displayName}</div>
          <div style={{ fontSize: 12, color: theme.muted }}>Beacon: major {selectedRow.beacon.major} • minor {selectedRow.beacon.minor}</div>
        </div>
        <Button variant="secondary" onClick={onBack} style={{ padding: "10px 12px" }}>Back</Button>
      </div>

      <Separator />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <Badge variant={st.variant}>{st.label}</Badge>
        <Badge variant="secondary" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <TrendIcon style={{ height: 16, width: 16, color: theme.accent }} />
          {tr.label}
        </Badge>
      </div>

      <div style={{ marginTop: 12, borderRadius: 18, padding: 16, border: `1px solid ${theme.border}`, background: theme.surface }}>
        <div style={{ fontSize: 12, color: theme.muted, fontWeight: 900 }}>Estimated distance</div>
        <div style={{ fontSize: 40, fontWeight: 950, letterSpacing: -0.6, marginTop: 6, color: theme.text }}>
          {isLive ? (selectedFeet == null ? "Unknown" : `${Math.round(selectedFeet)} ft`) : "Unknown"}
        </div>
        <div style={{ fontSize: 12, color: theme.muted, marginTop: 6 }}>
          {isLive && selectedState
            ? `RSSI: ${selectedState.lastRssi ?? "—"} dBm • Updated ${formatAge(nowMs() - selectedState.lastSeenMs)} ago`
            : "Asset is out of range or offline."}
        </div>
      </div>

      <div style={{ marginTop: 12, borderRadius: 18, padding: 16, border: `1px solid ${theme.border}`, background: theme.surface }}>
        <div style={{ fontSize: 12, color: theme.muted, fontWeight: 900 }}>GPS demo distance</div>
        <div style={{ marginTop: 6, fontSize: 14, fontWeight: 900, color: theme.text }}>
          {gpsFeet == null ? "Unknown" : `${Math.round(gpsFeet)} ft`}
        </div>
        <div style={{ fontSize: 12, color: theme.muted, marginTop: 6 }}>
          {geoErr ? geoErr : geoPos ? `Accuracy ±${Math.round(geoPos.acc || 0)}m` : "Waiting for location…"}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Button variant={simTargetKey === selectedRow.key ? "default" : "secondary"} onClick={() => setSimTargetKey(selectedRow.key)}>
          <Radar style={{ height: 16, width: 16 }} />
          Simulate walking toward
        </Button>
        <Button variant={simTargetKey == null ? "default" : "secondary"} onClick={() => setSimTargetKey(null)}>
          <RefreshCw style={{ height: 16, width: 16 }} />
          Simulate idle
        </Button>
      </div>
    </SurfaceCard>
  );
}

function CommissionScreen({ jobsites, commMajor, setCommMajor, commMinor, setCommMinor, commType, setCommType, commTag, setCommTag, onSave, theme }: any) {
  return (
    <SurfaceCard theme={theme}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <QrCode style={{ height: 18, width: 18, color: theme.accent }} />
        <div style={{ fontWeight: 950, fontSize: 16, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Commission a beacon</div>
      </div>

      <Separator />

      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: theme.muted }}>Project</div>
          <Select value={String(commMajor)} onValueChange={setCommMajor}>
            {jobsites.map((j: any) => (
              <SelectItem key={j.major} value={String(j.major)}>
                {j.name}
              </SelectItem>
            ))}
          </Select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: theme.muted }}>Beacon Minor</div>
          <Input value={commMinor} onChange={(e: any) => setCommMinor(e.target.value)} placeholder="e.g., 777" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: theme.muted }}>Asset Type</div>
          <Input value={commType} onChange={(e: any) => setCommType(e.target.value)} placeholder="Access Point" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: theme.muted }}>Asset Tag</div>
          <Input value={commTag} onChange={(e: any) => setCommTag(e.target.value)} placeholder="C1234" />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button onClick={onSave} disabled={!String(commMinor).trim()}>
            Save
          </Button>
          <Badge variant="secondary">UUID fixed</Badge>
        </div>
      </div>
    </SurfaceCard>
  );
}

function BeaconApp({
  headerBadge,
  jobsites,
  jobsiteMajor,
  setJobsiteMajor,
  q,
  setQ,
  tab,
  setTab,
  simRunning,
  setSimRunning,
  onHome,
  onOpenSettings,
  rows,
  onFind,
  selectedRow,
  selectedState,
  onBackFromFind,
  simTargetKey,
  setSimTargetKey,
  commissionProps,
  jobsiteName,
  theme,
  targetGeo,
}: any) {
  return (
    <PhoneFrame
      theme={theme}
      bottomBar={
        <BottomNav
          left={
            <Button variant="secondary" onClick={onHome} style={{ padding: "10px 12px" }}>
              <Home style={{ height: 16, width: 16, color: theme.accent }} />
              Home
            </Button>
          }
          center={headerBadge}
          right={
            <Button variant={simRunning ? "default" : "secondary"} onClick={() => setSimRunning((v: boolean) => !v)} style={{ padding: "10px 12px" }}>
              <RefreshCw style={{ height: 16, width: 16 }} />
              {simRunning ? "Sim On" : "Sim Off"}
            </Button>
          }
        />
      }
    >
      <Header title="Beacon Finder" subtitle="Nearby assets and Find view." theme={theme} />

      <SurfaceCard theme={theme}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="nearby">Nearby</TabsTrigger>
              <TabsTrigger value="commission">Commission</TabsTrigger>
              <TabsTrigger value="find" disabled={!selectedRow}>
                Find
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
            <div style={{ position: "relative", minWidth: 0 }}>
              <Search style={{ height: 16, width: 16, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: theme.muted }} />
              <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Search: tag, type, name, minor" style={{ paddingLeft: 38 }} />
            </div>

            <Select value={String(jobsiteMajor)} onValueChange={setJobsiteMajor}>
              <SelectItem value="all">All projects</SelectItem>
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
            <FindScreen
              selectedRow={selectedRow}
              selectedState={selectedState}
              onBack={onBackFromFind}
              simTargetKey={simTargetKey}
              setSimTargetKey={setSimTargetKey}
              theme={theme}
              targetGeo={targetGeo}
            />
          ) : null}

          {tab === "commission" ? <CommissionScreen jobsites={jobsites} {...commissionProps} theme={theme} /> : null}
        </div>
      </SurfaceCard>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onOpenSettings} style={{ padding: "10px 12px" }}>
          <SettingsIcon style={{ height: 16, width: 16, color: theme.accent }} />
          Settings
        </Button>
      </div>
    </PhoneFrame>
  );
}

function AssetDeployment({ headerBadge, onHome, onOpenSettings, mode, theme }: any) {
  const [ticket, setTicket] = useState("SR-20498");
  const [scanInput, setScanInput] = useState("");
  const [scanned, setScanned] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("In Use");
  const [location, setLocation] = useState<LocationOpt>("Jobsite Location");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraWrapRef = useRef<HTMLDivElement | null>(null);
  const fsWasFullscreenRef = useRef(false);
  const qrRef = useRef<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ts: number } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const lastScanRef = useRef<{ text: string; ts: number }>({ text: "", ts: 0 });

  const qrRegionId = "qr-reader-region";

  const showToast = useCallback((msg: string) => {
    setToast({ msg, ts: Date.now() });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1800) as any;
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const addCode = useCallback(
    (code: string) => {
      const v = String(code || "").trim();
      if (!v) return;
      setScanned((prev) => (prev.includes(v) ? prev : [v, ...prev]));
      showToast(`Scanned: ${v}`);
    },
    [showToast]
  );

  const addManual = useCallback(() => {
    const v = scanInput.trim();
    if (!v) return;
    addCode(v);
    setScanInput("");
  }, [scanInput, addCode]);

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
      setLookupResult({ ok: false, message: "Ticket not found. Try INC-10001 or SR-20498." });
      return;
    }
    setLookupResult({ ok: true, message: `Ticket found. Assets attached: ${assets.length}.`, assets });
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
      setSubmitResult({ ok: false, message: "Ticket not found." });
      return;
    }

    const merged = Array.from(new Set([...(existing || []), ...scanned]));
    (MOCK.ticketDB as any)[t] = merged;

    setSubmitResult({ ok: true, message: `Submitted. Ticket ${t} now has ${merged.length} asset(s). Status → ${status}. Location → ${location}.` });
    setLookupResult({ ok: true, message: `Ticket found. Assets attached: ${merged.length}.`, assets: merged });
  }, [ticket, scanned, status, location, mode]);

  const stopScanner = useCallback(async () => {
    try {
      if (qrRef.current) {
        await qrRef.current.stop();
        await qrRef.current.clear();
      }
    } catch {
      // ignore
    } finally {
      qrRef.current = null;
    }
  }, []);

  useEffect(() => {
    const lockOrientation = async () => {
      try {
        const el = cameraWrapRef.current;
        if (el && !document.fullscreenElement && (el as any).requestFullscreen) {
          await (el as any).requestFullscreen({ navigationUI: "hide" });
          fsWasFullscreenRef.current = true;
        }
      } catch {
        fsWasFullscreenRef.current = false;
      }

      try {
        const so: any = (screen as any).orientation;
        if (so?.lock) await so.lock("portrait");
      } catch {
        // ignore
      }
    };

    const unlockOrientation = async () => {
      try {
        const so: any = (screen as any).orientation;
        if (so?.unlock) so.unlock();
      } catch {
        // ignore
      }

      try {
        if (fsWasFullscreenRef.current && document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch {
        // ignore
      } finally {
        fsWasFullscreenRef.current = false;
      }
    };

    if (!cameraOpen) {
      stopScanner();
      unlockOrientation();
      return;
    }

    let cancelled = false;

    (async () => {
      setCameraError(null);
      await lockOrientation();

      try {
        const mod: any = await import("html5-qrcode");
        const Html5Qrcode = mod.Html5Qrcode;
        if (cancelled) return;

        const qr = new Html5Qrcode(qrRegionId);
        qrRef.current = qr;

        const config = { fps: 10, qrbox: { width: 260, height: 200 }, aspectRatio: 1.777 };

        await qr.start(
          { facingMode: "environment" },
          config,
          (decodedText: string) => {
            const now = Date.now();
            const last = lastScanRef.current;
            if (decodedText === last.text && now - last.ts < 1200) return;
            lastScanRef.current = { text: decodedText, ts: now };

            addCode(decodedText);

            try {
              qr.pause(true);
              setTimeout(() => {
                try {
                  qr.resume();
                } catch {
                  // ignore
                }
              }, 650);
            } catch {
              // ignore
            }
          },
          () => {
            // ignore
          }
        );
      } catch (e: any) {
        setCameraError(e?.message || "Unable to start camera scanner.");
      }
    })();

    return () => {
      cancelled = true;
      stopScanner();
      unlockOrientation();
    };
  }, [cameraOpen, addCode, stopScanner]);

  const openCamera = useCallback(() => {
    setCameraError(null);
    setCameraOpen(true);
  }, []);

  const closeCamera = useCallback(() => {
    setCameraOpen(false);
  }, []);

  return (
    <>
      <PhoneFrame
        theme={theme}
        bottomBar={
          <BottomNav
            left={
              <Button variant="secondary" onClick={onHome} style={{ padding: "10px 12px" }}>
                <Home style={{ height: 16, width: 16, color: theme.accent }} />
                Home
              </Button>
            }
            center={headerBadge}
            right={
              <Button variant="secondary" onClick={onOpenSettings} style={{ padding: "10px 12px" }}>
                <SettingsIcon style={{ height: 16, width: 16, color: theme.accent }} />
                Settings
              </Button>
            }
          />
        }
      >
        <Header title="Asset Deployment" subtitle="Scan barcodes and submit." theme={theme} leftGlyph={<ScanLine style={{ height: 20, width: 20, color: theme.accent }} />} />

        <SurfaceCard theme={theme}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: "100%", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ClipboardList style={{ height: 18, width: 18, color: theme.accent }} />
              <div style={{ fontWeight: 950 }}>Ticket</div>
            </div>

            <Input value={ticket} onChange={(e: any) => setTicket(e.target.value)} placeholder="e.g., INC-10001" />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button variant="secondary" onClick={lookupTicket}>Check ticket</Button>
            </div>

            {lookupResult ? <div style={{ fontSize: 13, color: lookupResult.ok ? theme.text : "rgba(220,38,38,0.95)" }}>{lookupResult.message}</div> : null}

            <Separator />

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ScanLine style={{ height: 18, width: 18, color: theme.accent }} />
              <div style={{ fontWeight: 950 }}>Scan assets</div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", width: "100%", minWidth: 0 }}>
              <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                <Input value={scanInput} onChange={(e: any) => setScanInput(e.target.value)} placeholder="Barcode" />
              </div>
              <Button onClick={addManual} style={{ flex: "0 0 auto" }}>
                <Package style={{ height: 16, width: 16 }} />
                Add
              </Button>
              <Button variant="secondary" onClick={openCamera} style={{ flex: "0 0 auto" }}>
                <ScanLine style={{ height: 16, width: 16, color: theme.accent }} />
                Camera
              </Button>
            </div>

            {scanned.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 950 }}>Scanned ({scanned.length})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                  {scanned.map((code) => (
                    <div key={code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderRadius: 14, padding: "10px 12px", border: `1px solid ${theme.border}`, minWidth: 0 }}>
                      <div style={{ fontWeight: 950, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{code}</div>
                      <Button variant="secondary" onClick={() => removeScan(code)} style={{ padding: "10px 12px", flex: "0 0 auto" }}>Remove</Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: theme.muted }}>No scanned assets yet.</div>
            )}

            <Separator />

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: theme.muted }}>Set status</div>
                <Select value={status} onValueChange={setStatus as any}>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: theme.muted }}>Set location</div>
                <Select value={location} onValueChange={setLocation as any}>
                  {LOCATION_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button onClick={submit}>Submit</Button>
              <Badge variant="secondary">Attaches assets to ticket if missing</Badge>
            </div>

            {submitResult ? <div style={{ fontSize: 13, color: submitResult.ok ? theme.text : "rgba(220,38,38,0.95)" }}>{submitResult.message}</div> : null}
          </div>
        </SurfaceCard>
      </PhoneFrame>

      {cameraOpen ? (
        <div
          ref={cameraWrapRef}
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(0,0,0,0.78)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 390,
              borderRadius: 22,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.18)",
              background: theme.bg === "#212121" ? "#1a1a1a" : "#0b0b0b",
              color: "#fff",
              boxShadow: "0 28px 80px rgba(0,0,0,0.55)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottom: "1px solid rgba(255,255,255,0.14)" }}>
              <div style={{ fontWeight: 950, fontSize: 14 }}>Scan Barcodes</div>
              <button
                onClick={closeCamera}
                style={{
                  height: 34,
                  width: 34,
                  borderRadius: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  cursor: "pointer",
                }}
                aria-label="Close camera"
              >
                <X style={{ height: 18, width: 18 }} />
              </button>
            </div>

            <div style={{ padding: 12 }}>
              <div id={qrRegionId} style={{ width: "100%" }} />
              {cameraError ? <div style={{ marginTop: 10, fontSize: 12, color: "#ffb4b4" }}>{cameraError}</div> : null}
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>Aim at a barcode. Scans will add to your list.</div>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 16,
            transform: "translateX(-50%)",
            padding: "10px 12px",
            borderRadius: 999,
            border: "1px solid rgba(0,0,0,0.18)",
            background: theme.bg === "#212121" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.92)",
            color: theme.text,
            boxShadow: "0 18px 42px rgba(0,0,0,0.22)",
            fontWeight: 950,
            fontSize: 13,
            maxWidth: "calc(100% - 16px)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            zIndex: 100,
          }}
        >
          {toast.msg}
        </div>
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
    mode === "checking" ? <Badge variant="secondary">Checking…</Badge> : mode === "backend" ? <Badge>Backend</Badge> : <Badge variant="secondary">Mock</Badge>;

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

  const [targetGeo, setTargetGeo] = useState<Record<string, { lat: number; lon: number }>>({});

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (cancelled) return;
        const base = { lat: p.coords.latitude, lon: p.coords.longitude };
        const next: Record<string, { lat: number; lon: number }> = {};
        for (const a of beaconAssets) {
          const k = beaconKey(a.beacon);
          if (next[k]) continue;
          const r = 45 * Math.sqrt(Math.random());
          const theta = Math.random() * Math.PI * 2;
          const dx = r * Math.cos(theta);
          const dy = r * Math.sin(theta);
          const dLat = dy / 111111;
          const dLon = dx / (111111 * Math.cos((base.lat * Math.PI) / 180));
          next[k] = { lat: base.lat + dLat, lon: base.lon + dLon };
        }
        setTargetGeo(next);
      },
      () => {
        const next: Record<string, { lat: number; lon: number }> = {};
        for (const a of beaconAssets) {
          const k = beaconKey(a.beacon);
          if (next[k]) continue;
          next[k] = { lat: 33.5207 + (Math.random() - 0.5) * 0.002, lon: -86.8025 + (Math.random() - 0.5) * 0.002 };
        }
        setTargetGeo(next);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 }
    );

    return () => {
      cancelled = true;
    };
  }, [beaconAssets]);

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
      return j ? j.name : `Project ${major}`;
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
    <ErrorBoundary>
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
              targetGeo={selectedRow ? targetGeo[selectedRow.key] : null}
            />
            {settingsPanel}
          </>
        ) : null}
      </ThemeVars>
    </ErrorBoundary>
  );
}
