import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
  Cog,
  Home,
  Package,
  QrCode,
  Radar,
  RefreshCw,
  ScanLine,
  Search,
  Server,
  Sun,
  Moon,
  Wifi,
  X,
} from "lucide-react";

type ThemeKey = "light" | "dark";

type Theme = {
  accent: string;
  bg: string;
  text: string;
  surface: string;
  border: string;
  muted: string;
  overlay: string;
};

type Jobsite = { major: number; name: string };

type Beacon = { uuid: string; major: number; minor: number };

type Asset = {
  id: string;
  displayName: string;
  assetType: string;
  assetTag: string;
  jobsiteMajor: number;
  locationHint?: string;
  beacon: Beacon;
  simulate?: boolean;
};

type Route = "toolbox" | "beacon_home" | "beacon_app" | "deployment";

type RangeState = {
  samples: number[];
  lastSeenMs: number;
  emaMeters: number | null;
  madMeters: number | null;
  deltaMeters: number | null;
  lastEmaMeters: number | null;
  lastRssi: number | null;
};

type Status = "In Stock" | "In Transit" | "In Use";

type LocationOpt = "Birmingham Office" | "Atlanta Office" | "Jobsite Location";

type Geo = { lat: number; lon: number };

type Toast = { msg: string; ts: number };

type BeaconTab = "nearby" | "commission" | "find";

type BadgeVariant = "default" | "secondary" | "destructive";

type ButtonVariant = "default" | "secondary" | "destructive";

type DetectorCtor = new (opts?: any) => { detect: (image: any) => Promise<any[]> };

const API_BASE = "http://localhost:8080";
const ORG_UUID = "2F234454-CF6D-4A0F-ADF2-F4911BA9FFA6";

const THEMES: Record<ThemeKey, Theme> = {
  dark: {
    accent: "#2167ad",
    bg: "#212121",
    text: "#ffffff",
    surface: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.14)",
    muted: "rgba(255,255,255,0.72)",
    overlay: "rgba(0,0,0,0.62)",
  },
  light: {
    accent: "#2167ad",
    bg: "#ffffff",
    text: "#000000",
    surface: "rgba(0,0,0,0.04)",
    border: "rgba(0,0,0,0.12)",
    muted: "rgba(0,0,0,0.62)",
    overlay: "rgba(0,0,0,0.30)",
  },
};

const STATUS_OPTIONS: Status[] = ["In Stock", "In Transit", "In Use"];
const LOCATION_OPTIONS: LocationOpt[] = ["Birmingham Office", "Atlanta Office", "Jobsite Location"];

const MOCK: {
  jobsites: Jobsite[];
  beaconAssets: Asset[];
  ticketDB: Record<string, string[]>;
} = {
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
  },
};

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
        <div style={{ padding: 16, fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 12, opacity: 0.9, whiteSpace: "pre-wrap" }}>{String(this.state.error?.message || this.state.error || "Unknown error")}</div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

function ThemeVars({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return (
    <div
      style={{
        // @ts-ignore
        "--accent": theme.accent,
        // @ts-ignore
        "--border": theme.border,
      }}
    >
      {children}
    </div>
  );
}

function GlobalStyles({ themeKey, theme }: { themeKey: ThemeKey; theme: Theme }) {
  const isDark = themeKey === "dark";
  return (
    <style>
      {`
        :root { color-scheme: ${isDark ? "dark" : "light"}; }
        html, body, #root { height: 100%; margin: 0; padding: 0; }
        body { background: ${theme.bg}; color: ${theme.text}; overflow: auto; }
        * { box-sizing: border-box; }
        button, input, select { font: inherit; }
        input, select { color: ${theme.text}; }
        select { background: transparent; }
        option { color: ${isDark ? "#fff" : "#000"}; background: ${isDark ? "#1f1f1f" : "#fff"}; }
      `}
    </style>
  );
}

function nowMs() {
  return Date.now();
}

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
  const med = median(arr);
  if (med == null) return null;
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

function toRad(d: number) {
  return (d * Math.PI) / 180;
}

function haversineMeters(a: Geo | null, b: Geo | null) {
  if (!a || !b) return null;
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

function beaconKey(b: Beacon) {
  return `${b.uuid}|${b.major}|${b.minor}`;
}

function Button({
  children,
  onClick,
  disabled,
  variant = "default",
  style,
}: {
  children: React.ReactNode;
  onClick?: any;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: any;
}) {
  const bg =
    variant === "default"
      ? "rgba(127,127,127,0.16)"
      : variant === "secondary"
      ? "transparent"
      : variant === "destructive"
      ? "rgba(220,38,38,0.15)"
      : "transparent";

  const border = variant === "default" ? "rgba(127,127,127,0.22)" : "var(--border)";

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        padding: "10px 12px",
        borderRadius: 14,
        border: `1px solid ${border}`,
        background: bg,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontWeight: 900,
        minWidth: 0,
        whiteSpace: "nowrap",
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Input(props: any) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "transparent",
        outline: "none",
        minWidth: 0,
        maxWidth: "100%",
        ...props?.style,
      }}
    />
  );
}

function Badge({ children, variant = "default", style }: { children: React.ReactNode; variant?: BadgeVariant; style?: any }) {
  const bg =
    variant === "destructive"
      ? "rgba(220,38,38,0.15)"
      : variant === "secondary"
      ? "rgba(127,127,127,0.14)"
      : "rgba(127,127,127,0.18)";
  return (
    <span
      style={{
        padding: "3px 8px",
        borderRadius: 999,
        fontSize: 12,
        border: "1px solid var(--border)",
        background: bg,
        fontWeight: 900,
        maxWidth: "100%",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function Separator() {
  return <div style={{ height: 1, background: "var(--border)", margin: "12px 0" }} />;
}

function SurfaceCard({ children, theme, style }: { children: React.ReactNode; theme: Theme; style?: any }) {
  return (
    <div
      style={{
        borderRadius: 22,
        padding: 14,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        minWidth: 0,
        maxWidth: "100%",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Header({ title, subtitle, theme, leftGlyph }: { title: React.ReactNode; subtitle?: string; theme: Theme; leftGlyph?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, maxWidth: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, maxWidth: "100%" }}>
        {leftGlyph ? (
          <div
            style={{
              height: 34,
              width: 34,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(127,127,127,0.12)",
              border: "1px solid rgba(127,127,127,0.22)",
              color: theme.accent,
              flex: "0 0 auto",
            }}
          >
            {leftGlyph}
          </div>
        ) : null}
        <div style={{ minWidth: 0, maxWidth: "100%" }}>
          <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: -0.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          {subtitle ? <div style={{ fontSize: 12, fontWeight: 700, color: theme.muted, marginTop: 2 }}>{subtitle}</div> : null}
        </div>
      </div>
    </div>
  );
}

function BrandMark({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      <path d="M12 2.5l7.5 7.5L12 17.5 4.5 10 12 2.5z" stroke={color} strokeWidth="2" />
      <path d="M7.2 13.2l4.8 4.3 4.8-4.3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BottomNav({ left, center, right }: { left: React.ReactNode; center: React.ReactNode; right: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center", minWidth: 0, maxWidth: "100%" }}>
      <div style={{ display: "flex", justifyContent: "flex-start", minWidth: 0 }}>{left}</div>
      <div style={{ display: "flex", justifyContent: "center", minWidth: 0, overflow: "hidden" }}>{center}</div>
      <div style={{ display: "flex", justifyContent: "flex-end", minWidth: 0 }}>{right}</div>
    </div>
  );
}

function PhoneFrame({ children, bottomBar, theme }: { children: React.ReactNode; bottomBar?: React.ReactNode; theme: Theme }) {
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
          width: "min(calc(100vw - 32px), 390px)",
          maxHeight: "calc(100vh - 32px)",
          aspectRatio: "9 / 16",
          borderRadius: 36,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: theme.bg,
          color: theme.text,
          border: `1px solid ${theme.border}`,
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            minWidth: 0,
            minHeight: 0,
          }}
        >
          {children}
        </div>
        {bottomBar ? <div style={{ padding: 12, borderTop: `1px solid ${theme.border}`, background: theme.bg, minWidth: 0 }}>{bottomBar}</div> : null}
      </div>
    </div>
  );
}

function Select({ value, onValueChange, children, theme }: { value: any; onValueChange: (v: string) => void; children: React.ReactNode; theme: Theme }) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "transparent",
        outline: "none",
        fontWeight: 900,
        minWidth: 0,
        color: theme.text,
        maxWidth: "100%",
      }}
    >
      {children}
    </select>
  );
}

function SelectItem({ value, children }: { value: any; children: React.ReactNode }) {
  return <option value={value}>{children}</option>;
}

function TabRow({ tab, setTab, disableFind }: { tab: BeaconTab; setTab: (t: BeaconTab) => void; disableFind: boolean }) {
  const mk = (label: string, val: BeaconTab, disabled?: boolean) => (
    <Button
      key={val}
      variant={tab === val ? "default" : "secondary"}
      onClick={() => setTab(val)}
      disabled={disabled}
      style={{
        width: "100%",
        justifyContent: "center",
        borderRadius: 16,
        padding: "10px 8px",
        fontSize: 13,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {label}
    </Button>
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, maxWidth: "100%", minWidth: 0, overflow: "hidden" }}>
      {mk("Nearby", "nearby")}
      {mk("Commission", "commission")}
      {mk("Find", "find", disableFind)}
    </div>
  );
}

function AvatarIcon({ assetType, theme }: { assetType: string; theme: Theme }) {
  const t = (assetType || "").toLowerCase();
  const style = { height: 18, width: 18, color: theme.accent };
  if (t.includes("access") || t.includes("ap")) return <Wifi {...style} />;
  if (t.includes("switch") || t.includes("router")) return <Server {...style} />;
  return <Radar {...style} />;
}

function SettingsModal({ mode, importFile, setImportFile, importResult, onImport, onClose, theme, themeKey, setThemeKey }: any) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: theme.overlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 80,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 390,
          borderRadius: 22,
          background: themeKey === "dark" ? "#2a2a2a" : "#f5f4f2",
          border: `1px solid ${theme.border}`,
          padding: 16,
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          color: theme.text,
          overflow: "hidden",
          minWidth: 0,
          fontFamily: "ui-rounded, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <Cog style={{ height: 18, width: 18, color: theme.accent, flex: "0 0 auto" }} />
            <div style={{ fontWeight: 950, fontSize: 16, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Settings</div>
          </div>
          <Button variant="secondary" onClick={onClose} style={{ padding: "10px 12px" }}>
            Close
          </Button>
        </div>

        <Separator />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontWeight: 950 }}>Appearance</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Button variant={themeKey === "light" ? "default" : "secondary"} onClick={() => setThemeKey("light")}> 
              <Sun style={{ height: 16, width: 16, color: theme.accent }} />
              Light
            </Button>
            <Button variant={themeKey === "dark" ? "default" : "secondary"} onClick={() => setThemeKey("dark")}> 
              <Moon style={{ height: 16, width: 16, color: theme.accent }} />
              Dark
            </Button>
          </div>
        </div>

        <Separator />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontWeight: 950 }}>Import beacon assets (CSV)</div>
          <Input type="file" accept=".csv,text/csv" onChange={(e: any) => setImportFile(e.target.files?.[0] || null)} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Button onClick={onImport} disabled={mode !== "backend"}>
              Import
            </Button>
            <Badge variant="secondary">UUID: {ORG_UUID}</Badge>
          </div>
          {importResult ? <div style={{ fontSize: 13, color: importResult.ok ? theme.text : "rgba(220,38,38,0.95)" }}>{String(importResult.message || "")}</div> : null}
        </div>

        <Separator />

        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: theme.muted }}>
          <div style={{ fontWeight: 950, color: theme.text }}>About</div>
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
        maxWidth: "100%",
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
          background: "rgba(127,127,127,0.12)",
          border: "1px solid rgba(127,127,127,0.22)",
          color: theme.accent,
          flex: "0 0 auto",
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0, maxWidth: "100%" }}>
        <div style={{ fontWeight: 950, fontSize: 16, color: theme.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        <div style={{ fontSize: 12, color: theme.muted, marginTop: 3, lineHeight: 1.35 }}>{subtitle}</div>
      </div>
    </button>
  );
}

function useBackendOrMock() {
  const [mode, setMode] = useState<"checking" | "backend" | "mock">("checking");
  const [jobsites, setJobsites] = useState<Jobsite[]>([]);
  const [beaconAssets, setBeaconAssets] = useState<Asset[]>([]);

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
              <Cog style={{ height: 16, width: 16, color: theme.accent }} />
              Settings
            </Button>
          }
        />
      }
    >
      <Header
        title={
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0, maxWidth: "100%" }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: theme.accent, flex: "0 0 auto" }}>
              <BrandMark color={theme.accent} size={18} />
            </span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Virtual Toolbox</span>
          </div>
        }
        subtitle="Select a tool."
        theme={theme}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", minWidth: 0, maxWidth: "100%" }}>
        <TileButton title="Beacon Finder" subtitle="List nearby assets and open a Find view." icon={<Radar style={{ height: 22, width: 22 }} />} onClick={onOpenBeacon} theme={theme} />
        <TileButton title="Asset Deployment" subtitle="Scan barcodes and submit a deployment form." icon={<ScanLine style={{ height: 22, width: 22 }} />} onClick={onOpenDeployment} theme={theme} />
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
              <Cog style={{ height: 16, width: 16, color: theme.accent }} />
              Settings
            </Button>
          }
        />
      }
    >
      <Header title="Beacon Finder" subtitle="Choose a project." theme={theme} leftGlyph={<Radar style={{ height: 18, width: 18, color: theme.accent }} />} />

      <SurfaceCard theme={theme}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, maxWidth: "100%" }}>
          <div style={{ fontWeight: 950, fontSize: 13, color: theme.muted }}>Project</div>
          <Select value={selectedMajor} onValueChange={setSelectedMajor} theme={theme}>
            <SelectItem value="">Select location</SelectItem>
            {jobsites.map((j: Jobsite) => (
              <SelectItem key={j.major} value={String(j.major)}>
                {j.name}
              </SelectItem>
            ))}
          </Select>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button onClick={() => onEnter(selectedMajor)} disabled={!selectedMajor}>
              Enter
            </Button>
            <Button variant="secondary" onClick={() => onEnter("all")}>
              View all
            </Button>
          </div>
        </div>
      </SurfaceCard>
    </PhoneFrame>
  );
}

function NearbyList({ rows, jobsiteName, onFind, theme }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, maxWidth: "100%" }}>
      {rows.length === 0 ? <div style={{ fontSize: 13, color: theme.muted }}>No assets match the current filter.</div> : null}
      {rows.map((row: any) => {
        const feet = ft(row.meters);
        const st = stabilityLabel(row.madMeters);
        const tr = trendLabel(row.deltaMeters);
        const TrendIcon = tr.Icon;

        return (
          <SurfaceCard key={row.key} theme={theme}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, minWidth: 0, maxWidth: "100%" }}>
              <div style={{ display: "flex", gap: 12, minWidth: 0, flex: 1, maxWidth: "100%" }}>
                <div
                  style={{
                    height: 38,
                    width: 38,
                    borderRadius: 14,
                    border: `1px solid ${theme.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "0 0 auto",
                  }}
                >
                  <AvatarIcon assetType={row.asset.assetType} theme={theme} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1, maxWidth: "100%" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, minWidth: 0, maxWidth: "100%" }}>
                    <div style={{ fontWeight: 950, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{row.asset.displayName}</div>
                    <Badge variant={st.variant}>{st.label}</Badge>
                    {row.fresh ? <Badge>Live</Badge> : <Badge variant="secondary">Out of range</Badge>}
                  </div>

                  <div style={{ fontSize: 12, color: theme.muted, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                    {jobsiteName(row.asset.jobsiteMajor)}{row.asset.locationHint ? ` • ${row.asset.locationHint}` : ""}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: 12, minWidth: 0, maxWidth: "100%" }}>
                    <div style={{ fontWeight: 950, color: theme.text }}>Distance: {row.fresh ? (feet == null ? "Unknown" : `${Math.round(feet)} ft`) : "Unknown"}</div>
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
  const [geoPos, setGeoPos] = useState<Geo | null>(null);
  const [geoAcc, setGeoAcc] = useState<number | null>(null);
  const [geoErr, setGeoErr] = useState<string | null>(null);

  useEffect(() => {
    setGeoErr(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoErr("Geolocation not available.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        setGeoPos({ lat: p.coords.latitude, lon: p.coords.longitude });
        setGeoAcc(p.coords.accuracy);
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
        return;
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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, minWidth: 0, maxWidth: "100%" }}>
        <div style={{ minWidth: 0, maxWidth: "100%" }}>
          <div style={{ fontWeight: 950, fontSize: 16, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{selectedRow.asset.displayName}</div>
          <div style={{ fontSize: 12, color: theme.muted }}>Beacon: major {selectedRow.beacon.major} • minor {selectedRow.beacon.minor}</div>
        </div>
        <Button variant="secondary" onClick={onBack} style={{ padding: "10px 12px" }}>
          Back
        </Button>
      </div>

      <Separator />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <Badge variant={st.variant}>{st.label}</Badge>
        <Badge variant="secondary" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <TrendIcon style={{ height: 16, width: 16, color: theme.accent }} />
          {tr.label}
        </Badge>
      </div>

      <div style={{ marginTop: 12, borderRadius: 18, padding: 16, border: `1px solid ${theme.border}`, background: theme.surface, maxWidth: "100%" }}>
        <div style={{ fontSize: 12, color: theme.muted, fontWeight: 950 }}>Estimated distance</div>
        <div style={{ fontSize: 40, fontWeight: 950, letterSpacing: -0.6, marginTop: 6, color: theme.text }}>{isLive ? (selectedFeet == null ? "Unknown" : `${Math.round(selectedFeet)} ft`) : "Unknown"}</div>
        <div style={{ fontSize: 12, color: theme.muted, marginTop: 6 }}>{isLive && selectedState ? `RSSI: ${selectedState.lastRssi ?? "—"} dBm • Updated ${formatAge(nowMs() - selectedState.lastSeenMs)} ago` : "Asset is out of range or offline."}</div>
      </div>

      <div style={{ marginTop: 12, borderRadius: 18, padding: 16, border: `1px solid ${theme.border}`, background: theme.surface, maxWidth: "100%" }}>
        <div style={{ fontSize: 12, color: theme.muted, fontWeight: 950 }}>GPS demo distance</div>
        <div style={{ marginTop: 6, fontSize: 14, fontWeight: 950, color: theme.text }}>{gpsFeet == null ? "Unknown" : `${Math.round(gpsFeet)} ft`}</div>
        <div style={{ fontSize: 12, color: theme.muted, marginTop: 6 }}>{geoErr ? geoErr : geoPos ? `Accuracy ±${Math.round(geoAcc || 0)}m` : "Waiting for location…"}</div>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10, maxWidth: "100%" }}>
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
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, maxWidth: "100%" }}>
        <QrCode style={{ height: 18, width: 18, color: theme.accent }} />
        <div style={{ fontWeight: 950, fontSize: 16, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>Commission a beacon</div>
      </div>

      <Separator />

      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, maxWidth: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 950, color: theme.muted }}>Project</div>
          <Select value={String(commMajor)} onValueChange={setCommMajor} theme={theme}>
            {jobsites.map((j: Jobsite) => (
              <SelectItem key={j.major} value={String(j.major)}>
                {j.name}
              </SelectItem>
            ))}
          </Select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 950, color: theme.muted }}>Beacon Minor</div>
          <Input value={commMinor} onChange={(e: any) => setCommMinor(e.target.value)} placeholder="e.g., 777" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 950, color: theme.muted }}>Asset Type</div>
          <Input value={commType} onChange={(e: any) => setCommType(e.target.value)} placeholder="Access Point" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 950, color: theme.muted }}>Asset Tag</div>
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

function BeaconApp({ headerBadge, jobsites, jobsiteMajor, setJobsiteMajor, q, setQ, tab, setTab, simRunning, setSimRunning, onHome, onOpenSettings, rows, onFind, selectedRow, selectedState, onBackFromFind, simTargetKey, setSimTargetKey, commissionProps, jobsiteName, theme, targetGeo }: any) {
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
              <RefreshCw style={{ height: 16, width: 16, color: theme.accent }} />
              {simRunning ? "Sim On" : "Sim Off"}
            </Button>
          }
        />
      }
    >
      <Header title="Beacon Finder" subtitle="Nearby assets and Find view." theme={theme} leftGlyph={<Radar style={{ height: 18, width: 18, color: theme.accent }} />} />

      <SurfaceCard theme={theme}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, maxWidth: "100%" }}>
          <TabRow tab={tab} setTab={setTab} disableFind={!selectedRow} />

          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0, maxWidth: "100%" }}>
            <div style={{ position: "relative", minWidth: 0, maxWidth: "100%" }}>
              <Search style={{ height: 16, width: 16, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: theme.muted }} />
              <Input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Search: tag, type, name, minor" style={{ paddingLeft: 38 }} />
            </div>

            <Select value={String(jobsiteMajor)} onValueChange={setJobsiteMajor} theme={theme}>
              <SelectItem value="all">All projects</SelectItem>
              {jobsites.map((j: Jobsite) => (
                <SelectItem key={j.major} value={String(j.major)}>
                  {j.name}
                </SelectItem>
              ))}
            </Select>
          </div>

          <Separator />

          {tab === "nearby" ? <NearbyList rows={rows} jobsiteName={jobsiteName} onFind={onFind} theme={theme} /> : null}

          {tab === "find" && selectedRow ? (
            <FindScreen selectedRow={selectedRow} selectedState={selectedState} onBack={onBackFromFind} simTargetKey={simTargetKey} setSimTargetKey={setSimTargetKey} theme={theme} targetGeo={targetGeo} />
          ) : null}

          {tab === "commission" ? <CommissionScreen jobsites={jobsites} {...commissionProps} theme={theme} /> : null}
        </div>
      </SurfaceCard>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onOpenSettings} style={{ padding: "10px 12px" }}>
          <Cog style={{ height: 16, width: 16, color: theme.accent }} />
          Settings
        </Button>
      </div>
    </PhoneFrame>
  );
}

async function resolveBarcodeDetectorCtor(): Promise<DetectorCtor | null> {
  const win: any = typeof window === "undefined" ? null : (window as any);
  if (win?.BarcodeDetector) return win.BarcodeDetector as DetectorCtor;
  return null;
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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);
  const zxingRef = useRef<BrowserMultiFormatReader | null>(null);
  const zxingActiveRef = useRef(false);
  const lastScanRef = useRef<{ text: string; ts: number }>({ text: "", ts: 0 });

  const showToast = useCallback((msg: string) => {
    setToast({ msg, ts: Date.now() });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1600) as any;
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

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    zxingActiveRef.current = false;
    if (zxingRef.current) {
      try {
        zxingRef.current.reset();
      } catch {
        return;
      }
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {
          return;
        }
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        return;
      }
      videoRef.current.srcObject = null;
    }
    detectorRef.current = null;
  }, []);

  const scanLoop = useCallback(async () => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector) return;

    if (video.readyState >= 2) {
      try {
        const barcodes = await detector.detect(video);
        if (Array.isArray(barcodes) && barcodes.length) {
          const raw = String(barcodes[0]?.rawValue || "").trim();
          if (raw) {
            const now = Date.now();
            const last = lastScanRef.current;
            if (!(raw === last.text && now - last.ts < 900)) {
              lastScanRef.current = { text: raw, ts: now };
              addCode(raw);
            }
          }
        }
      } catch {
        return;
      }
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  }, [addCode]);

  useEffect(() => {
    if (!cameraOpen) {
      stopCamera();
      return;
    }

    let cancelled = false;

    (async () => {
      setCameraError(null);

      try {
        // @ts-ignore
        if ((screen as any)?.orientation?.lock) await (screen as any).orientation.lock("portrait");
      } catch {
        return;
      }

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera is not available in this environment.");
        return;
      }

      const video = videoRef.current;
      if (!video) {
        setCameraError("Camera view failed to initialize.");
        return;
      }

      const Detector = await resolveBarcodeDetectorCtor();
      if (Detector) {
        try {
          const desired = ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "qr_code", "pdf417", "data_matrix"];
          let supported: string[] | null = null;
          const AnyDetector: any = Detector as any;
          if (typeof AnyDetector.getSupportedFormats === "function") {
            try {
              supported = await AnyDetector.getSupportedFormats();
            } catch {
              supported = null;
            }
          }
          const formats = supported ? desired.filter((f) => supported!.includes(f)) : desired;
          detectorRef.current = formats.length ? new (Detector as any)({ formats }) : new (Detector as any)();
        } catch {
          detectorRef.current = null;
        }
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        if (detectorRef.current) {
          rafRef.current = requestAnimationFrame(scanLoop);
          return;
        }

        const reader = (zxingRef.current ||= new BrowserMultiFormatReader());
        zxingActiveRef.current = true;
        reader.decodeFromVideoElementContinuously(video, (result) => {
          if (!zxingActiveRef.current) return;
          if (result) {
            const raw = String(result.getText() || "").trim();
            if (!raw) return;
            const now = Date.now();
            const last = lastScanRef.current;
            if (!(raw === last.text && now - last.ts < 900)) {
              lastScanRef.current = { text: raw, ts: now };
              addCode(raw);
            }
          }
        });
      } catch (e: any) {
        setCameraError(e?.message || "Unable to access camera.");
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
      try {
        // @ts-ignore
        if ((screen as any)?.orientation?.unlock) (screen as any).orientation.unlock();
      } catch {
        return;
      }
    };
  }, [cameraOpen, scanLoop, stopCamera, addCode]);

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
                <Cog style={{ height: 16, width: 16, color: theme.accent }} />
                Settings
              </Button>
            }
          />
        }
      >
        <Header title="Asset Deployment" subtitle="Scan barcodes and submit." theme={theme} leftGlyph={<ScanLine style={{ height: 18, width: 18, color: theme.accent }} />} />

        <SurfaceCard theme={theme}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: "100%" }}>
              <ClipboardList style={{ height: 18, width: 18, color: theme.accent }} />
              <div style={{ fontWeight: 950 }}>Ticket</div>
            </div>

            <Input value={ticket} onChange={(e: any) => setTicket(e.target.value)} placeholder="e.g., INC-10001" />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", maxWidth: "100%" }}>
              <Button variant="secondary" onClick={lookupTicket}>
                Check ticket
              </Button>
            </div>

            {lookupResult ? <div style={{ fontSize: 13, color: lookupResult.ok ? theme.text : "rgba(220,38,38,0.95)", maxWidth: "100%" }}>{lookupResult.message}</div> : null}

            <Separator />

            <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: "100%" }}>
              <ScanLine style={{ height: 18, width: 18, color: theme.accent }} />
              <div style={{ fontWeight: 950 }}>Scan assets</div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", width: "100%", minWidth: 0, maxWidth: "100%" }}>
              <div style={{ flex: "1 1 180px", minWidth: 0, maxWidth: "100%" }}>
                <Input value={scanInput} onChange={(e: any) => setScanInput(e.target.value)} placeholder="Barcode" />
              </div>
              <Button onClick={addManual} style={{ flex: "0 0 auto" }}>
                <Package style={{ height: 16, width: 16, color: theme.accent }} />
                Add
              </Button>
              <Button variant="secondary" onClick={openCamera} style={{ flex: "0 0 auto" }}>
                <ScanLine style={{ height: 16, width: 16, color: theme.accent }} />
                Camera
              </Button>
            </div>

            {scanned.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0, maxWidth: "100%" }}>
                <div style={{ fontSize: 13, fontWeight: 950 }}>Scanned ({scanned.length})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, maxWidth: "100%" }}>
                  {scanned.map((code) => (
                    <div key={code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderRadius: 14, padding: "10px 12px", border: `1px solid ${theme.border}`, minWidth: 0, maxWidth: "100%" }}>
                      <div style={{ fontWeight: 950, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{code}</div>
                      <Button variant="secondary" onClick={() => removeScan(code)} style={{ padding: "10px 12px", flex: "0 0 auto" }}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: theme.muted }}>No scanned assets yet.</div>
            )}

            <Separator />

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, minWidth: 0, maxWidth: "100%" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, maxWidth: "100%" }}>
                <div style={{ fontSize: 12, fontWeight: 950, color: theme.muted }}>Set status</div>
                <Select value={status} onValueChange={setStatus as any} theme={theme}>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, maxWidth: "100%" }}>
                <div style={{ fontSize: 12, fontWeight: 950, color: theme.muted }}>Set location</div>
                <Select value={location} onValueChange={setLocation as any} theme={theme}>
                  {LOCATION_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", maxWidth: "100%" }}>
              <Button onClick={submit}>Submit</Button>
              <Badge variant="secondary">Attaches assets to ticket if missing</Badge>
            </div>

            {submitResult ? <div style={{ fontSize: 13, color: submitResult.ok ? theme.text : "rgba(220,38,38,0.95)", maxWidth: "100%" }}>{submitResult.message}</div> : null}
          </div>
        </SurfaceCard>
      </PhoneFrame>

      {cameraOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            background: "rgba(0,0,0,0.78)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 390,
              borderRadius: 22,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.18)",
              background: "#0b0b0b",
              color: "#fff",
              boxShadow: "0 28px 80px rgba(0,0,0,0.55)",
              minWidth: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottom: "1px solid rgba(255,255,255,0.14)", gap: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 13, letterSpacing: 0.2 }}>SCAN BARCODES</div>
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
              <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.14)", background: "#000" }}>
                <video ref={videoRef} playsInline muted style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
              {cameraError ? <div style={{ marginTop: 10, fontSize: 12, color: "#ffb4b4" }}>{cameraError}</div> : null}
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>Keep scanning. Each scan adds to your list.</div>
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
            border: `1px solid ${theme.border}`,
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

export default function VirtualToolboxPrototype() {
  const { mode, jobsites, beaconAssets, setBeaconAssets } = useBackendOrMock();

  const [themeKey, setThemeKey] = useState<ThemeKey>(() => {
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
      return;
    }
  }, [themeKey]);

  const theme = THEMES[themeKey];

  const headerBadge = mode === "checking" ? <Badge variant="secondary">Checking…</Badge> : mode === "backend" ? <Badge>Backend</Badge> : <Badge variant="secondary">Mock</Badge>;

  const [route, setRoute] = useState<Route>("toolbox");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [importFile, setImportFile] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const [beaconHomeSelectedMajor, setBeaconHomeSelectedMajor] = useState("");
  const [beaconTab, setBeaconTab] = useState<BeaconTab>("nearby");
  const [beaconJobsiteMajor, setBeaconJobsiteMajor] = useState<string>("all");
  const [beaconQ, setBeaconQ] = useState("");
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const [ranged, setRanged] = useState<Map<string, RangeState>>(() => new Map());

  const [simRunning, setSimRunning] = useState(true);
  const [simTargetKey, setSimTargetKey] = useState<string | null>(null);
  const simStateRef = useRef<Record<string, { meters: number }>>({});

  const [targetGeo, setTargetGeo] = useState<Record<string, Geo>>({});

  useEffect(() => {
    const buildFallback = () => {
      const next: Record<string, Geo> = {};
      for (const a of beaconAssets) {
        const k = beaconKey(a.beacon);
        if (!next[k]) next[k] = { lat: 33.5207 + (Math.random() - 0.5) * 0.002, lon: -86.8025 + (Math.random() - 0.5) * 0.002 };
      }
      setTargetGeo(next);
    };

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      buildFallback();
      return;
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (cancelled) return;
        const base: Geo = { lat: p.coords.latitude, lon: p.coords.longitude };
        const next: Record<string, Geo> = {};
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
        if (cancelled) return;
        buildFallback();
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
      .filter((a: Asset) => (beaconJobsiteMajor === "all" ? true : a.jobsiteMajor === Number(beaconJobsiteMajor)))
      .filter((a: Asset) => {
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
      .map((a: Asset) => {
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
        next.get(key) || {
          samples: [],
          lastSeenMs: 0,
          emaMeters: null,
          madMeters: null,
          deltaMeters: null,
          lastEmaMeters: null,
          lastRssi: null,
        };

      const samples = [...curr.samples, metersVal].slice(-18);
      const med = (median(samples) as number) ?? metersVal;
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

    const id = window.setInterval(() => {
      const audible = beaconAssets
        .filter((a: Asset) => (beaconJobsiteMajor === "all" ? true : a.jobsiteMajor === Number(beaconJobsiteMajor)))
        .filter((a: Asset) => a.simulate !== false)
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

    return () => window.clearInterval(id);
  }, [simRunning, route, beaconAssets, beaconJobsiteMajor, simTargetKey, ingestObservation]);

  const jobsiteName = useCallback(
    (major: number) => {
      const j = jobsites.find((x: Jobsite) => x.major === major);
      return j ? j.name : "Project";
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
    const beacon: Beacon = { uuid: ORG_UUID, major, minor };

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

    setBeaconAssets((prev: Asset[]) => [{ id: `m${Math.random().toString(16).slice(2)}`, displayName, assetType: commType, assetTag: commTag, jobsiteMajor: major, locationHint: "", beacon }, ...prev]);
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
            <ToolboxHome headerBadge={headerBadge} onOpenBeacon={() => setRoute("beacon_home")} onOpenDeployment={() => setRoute("deployment")} onOpenSettings={() => setSettingsOpen(true)} theme={theme} />
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
              onGoToolbox={() => setRoute("toolbox")}
              onOpenSettings={() => setSettingsOpen(true)}
              theme={theme}
            />
            {settingsPanel}
          </>
        ) : null}

        {route === "deployment" ? (
          <>
            <AssetDeployment headerBadge={headerBadge} onHome={() => setRoute("toolbox")} onOpenSettings={() => setSettingsOpen(true)} mode={mode} theme={theme} />
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
