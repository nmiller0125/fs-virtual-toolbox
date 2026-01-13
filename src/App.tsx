import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
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
  Settings as SettingsIcon,
} from "lucide-react";

// -------------------------------------------------
// Simple local UI components (Option A)
// -------------------------------------------------

type BtnVariant = "default" | "secondary" | "destructive";

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
    fontWeight: 600,
    lineHeight: 1,
    transition: "transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease, border-color 120ms ease",
    boxShadow: "0 1px 0 rgba(0,0,0,0.05)",
    maxWidth: "100%",
    boxSizing: "border-box",
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
        fontWeight: 600,
        letterSpacing: 0.2,
        maxWidth: "100%",
        boxSizing: "border-box",
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
  return <TabsCtx.Provider value={{ value, onValueChange }}><div>{children}</div></TabsCtx.Provider>;
}

function TabsList({ children }: any) {
  return <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>;
}

function TabsTrigger({ children, value, disabled }: any) {
  const ctx = React.useContext(TabsCtx);
  const active = ctx?.value === value;
  return (
    <Button
      variant={active ? "default" : "secondary"}
      disabled={disabled}
      onClick={() => ctx?.onValueChange(value)}
      style={{ borderRadius: 999 }}
    >
      {children}
    </Button>
  );
}

// Select (native; supports existing JSX shape)
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

function SelectTrigger({ children }: any) {
  return <>{children}</>;
}
function SelectValue({ placeholder }: any) {
  return <>{placeholder ?? ""}</>;
}
function SelectContent({ children }: any) {
  return <>{children}</>;
}
function SelectItem({ value, children, ...rest }: any) {
  return (
    <option value={value} {...rest}>
      {children}
    </option>
  );
}


/**
 * Field Services – Virtual Toolbox (Web Prototype)
 *
 * Modules:
 * - Beacon Finder (iBeacon concept): Nearby / Find / Commission
 * - Asset Deployment (barcode scan concept): deploy assets to tickets/locations
 *
 * Notes:
 * - This is a web prototype for UI review only.
 * - Mobile implementation would use CoreLocation + CoreMotion (Beacon Finder) and AVFoundation camera scanning (Barcode).
 */

// -----------------------------
// Config + Mock Data
// -----------------------------

type Route = "toolbox" | "beacon_home" | "beacon_app" | "deployment";
type Status = "In Stock" | "In Transit" | "In Use";
type LocationOpt = "Birmingham Office" | "Atlanta Office" | "Jobsite Location";


const API_BASE = "http://localhost:8080";
const ORG_UUID = "2F234454-CF6D-4A0F-ADF2-F4911BA9FFA6";

const THEMES = {
  dark: {
    name: "Dark",
    accent: "#22fafa",
    bg: "#212121",
    text: "#ffffff",
    // Slightly brighter surfaces for readability (especially in modals)
    surface: "rgba(255,255,255,0.10)",
    border: "rgba(255,255,255,0.18)",
    muted: "rgba(255,255,255,0.78)",
  },
  light: {
    name: "Light",
    accent: "#2167ad",
    bg: "#ffffff",
    text: "#000000",
    surface: "rgba(0,0,0,0.04)",
    border: "rgba(0,0,0,0.12)",
    muted: "rgba(0,0,0,0.62)",
  },
};

// Brand mark image. Place the provided logo at: /public/brand-mark.png
// (Vite serves it at /brand-mark.png)
const BRAND_LOGO_PATH = "/brand-mark.png";

// Optional legacy logo data URI. Leave empty to use brand mark above.
const BG_LOGO_DATA_URI = "";

const MOCK = {
  jobsites: [
    { major: 1201, name: "Nashville – Project A" },
    { major: 1202, name: "Birmingham – Project B" },
  ],
  beaconAssets: [
    {
      id: "a1",
      displayName: "Access Point – C1234",
      assetType: "Access Point",
      assetTag: "C1234",
      jobsiteMajor: 1201,
      locationHint: "IDF-2, Rack A",
      beacon: { uuid: ORG_UUID, major: 1201, minor: 501 },
    },
    {
      id: "a2",
      displayName: "Switch – C2388",
      assetType: "Switch",
      assetTag: "C2388",
      jobsiteMajor: 1201,
      locationHint: "MDF, Rack B",
      beacon: { uuid: ORG_UUID, major: 1201, minor: 502 },
    },
    {
      id: "a3",
      displayName: "Cradlepoint – C9910",
      assetType: "Cradlepoint",
      assetTag: "C9910",
      jobsiteMajor: 1202,
      locationHint: "Trailer, Network Cabinet",
      beacon: { uuid: ORG_UUID, major: 1202, minor: 601 },
    },
    // Intentionally out-of-range demo rows
    {
      id: "a4",
      displayName: "Access Point – C4501",
      assetType: "Access Point",
      assetTag: "C4501",
      jobsiteMajor: 1202,
      locationHint: "IDF-1, Rack C",
      beacon: { uuid: ORG_UUID, major: 1202, minor: 602 },
      simulate: false,
    },
    {
      id: "a5",
      displayName: "Switch – C4502",
      assetType: "Switch",
      assetTag: "C4502",
      jobsiteMajor: 1202,
      locationHint: "MDF, Rack D",
      beacon: { uuid: ORG_UUID, major: 1202, minor: 603 },
      simulate: false,
    },
  ],
  ticketDB: {
    // Ticket number -> attached assets (barcode strings)
    "INC-10001": ["C1234"],
    "SR-20498": [],
  },
};

// -----------------------------
// Helpers
// -----------------------------

const nowMs = () => Date.now();

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function ft(meters) {
  if (meters == null || Number.isNaN(meters) || meters < 0) return null;
  return meters * 3.28084;
}

function haversineMeters(a, b) {
  if (!a || !b) return null;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000; // meters
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

function formatAge(ms) {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 120) return `${s}s`;
  return `${Math.round(s / 60)}m`;
}

function median(arr) {
  if (!arr.length) return null;
  const a = [...arr].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function mad(arr) {
  if (arr.length < 4) return null;
  const med = median(arr) as number;
  const dev = arr.map((x) => Math.abs(x - med));
  return median(dev);
}

function stabilityLabel(madMeters) {
  if (madMeters == null) return { label: "Warming up", variant: "secondary" as const };
  if (madMeters < 0.25) return { label: "Stable", variant: "default" as const };
  if (madMeters < 0.6) return { label: "Moderate", variant: "secondary" as const };
  return { label: "Unstable", variant: "destructive" as const };
}

function trendLabel(deltaMeters) {
  if (deltaMeters == null) return { Icon: ArrowRight, label: "Collecting" };
  if (Math.abs(deltaMeters) < 0.2) return { Icon: ArrowRight, label: "Flat" };
  if (deltaMeters < 0) return { Icon: ArrowUpRight, label: "Getting closer" };
  return { Icon: ArrowDownRight, label: "Getting farther" };
}

function beaconKey(b) {
  return `${b.uuid}|${b.major}|${b.minor}`;
}

// -----------------------------
// UI Primitives
// -----------------------------

function ThemeToggle({ themeKey, setThemeKey, theme }: any) {
  const isDark = themeKey === "dark";
  return (
    <Button
      variant="secondary"
      onClick={() => setThemeKey(isDark ? "light" : "dark")}
      className="w-full justify-start"
      style={{ borderColor: theme.border }}
    >
      {isDark ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
      {isDark ? "Light theme" : "Dark theme"}
    </Button>
  );
}

function PhoneFrame({ children, theme }: any) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backgroundColor: theme.bg,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
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
          // CSS variables for consistent theming in primitives
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
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: 16, display: "flex", flexDirection: "column", gap: 14, boxSizing: "border-box" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Header({ title, subtitle, right, theme, leftGlyph }: any) {
  // Light-mode detection (keeps logic local—no need to pass themeKey everywhere)
  const isLight = String(theme?.bg || "").toLowerCase() === "#ffffff";

  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src={BG_LOGO_DATA_URI || BRAND_LOGO_PATH}
            alt="Brand"
            style={{
              height: 28,
              width: 28,
              borderRadius: 10,
              objectFit: "contain",
              // Requested: logo black in light mode
              filter: isLight ? "invert(1)" : "invert(0)",
              opacity: 0.92,
              flex: "0 0 auto",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            {leftGlyph === null ? null : leftGlyph ? (
              <span style={{ display: "inline-flex", flex: "0 0 auto" }}>{leftGlyph}</span>
            ) : (
              <Radar style={{ height: 20, width: 20, color: theme.accent, flex: "0 0 auto" }} />
            )}
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                letterSpacing: -0.3,
                color: theme.text,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title}
            </div>
          </div>
        </div>

        {subtitle ? <div style={{ fontSize: 13, lineHeight: 1.35, color: theme.muted }}>{subtitle}</div> : null}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 10,
          minWidth: 0,
          flex: "0 1 170px",
          maxWidth: "45%",
        }}
      >
        {right}
      </div>
    </div>
  );
}

function SurfaceCard({ children, theme, className = "", style }: any) {
  return (
    <div
      className={className}
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

function AvatarIcon({ assetType, theme }: any) {
  const t = (assetType || "").toLowerCase();
  const style = { color: theme.accent };
  if (t.includes("access") || t.includes("ap")) return <Wifi className="h-5 w-5" style={style} />;
  if (t.includes("switch") || t.includes("router")) return <Server className="h-5 w-5" style={style} />;
  return <MapPin className="h-5 w-5" style={style} />;
}


// -----------------------------
// Backend-or-mock hook
// -----------------------------

function useBackendOrMock() {
  const [mode, setMode] = useState("checking");
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

// -----------------------------
// Settings
// -----------------------------

function SettingsPanel({ mode, importFile, setImportFile, importResult, onImport, onClose, theme, themeKey, setThemeKey }: any) {
  const panelBg = themeKey === "dark" ? "#2a2a2a" : "#f8f7f4";
  const panelBorder = themeKey === "dark" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)";
  return (
    <SurfaceCard
      theme={theme}
      style={{
        width: "100%",
        maxWidth: 360,
        backgroundColor: panelBg,
        border: `1px solid ${panelBorder}`,
        boxShadow: "0 18px 50px rgba(0,0,0,0.22)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.2 }}>Settings</div>
        <Button variant="secondary" onClick={onClose} style={{ borderColor: theme.border }}>
          Close
        </Button>
      </div>

      <Separator />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>Appearance</div>
        <ThemeToggle themeKey={themeKey} setThemeKey={setThemeKey} theme={theme} />
      </div>

      <Separator />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>Import beacon assets (CSV)</div>
        <Input type="file" accept=".csv,text/csv" onChange={(e: any) => setImportFile(e.target.files?.[0] || null)} />
        <Button onClick={onImport} disabled={mode !== "backend"}>
          Import
        </Button>
        {importResult ? <div style={{ fontSize: 13, color: theme.muted }}>{importResult.message}</div> : null}
      </div>

      <Separator />

      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: theme.muted }}>
        <div style={{ fontWeight: 800, color: theme.text }}>About</div>
        <div>Field Services – Virtual Toolbox</div>
        <div>Beacon Finder UUID: {ORG_UUID}</div>
      </div>
    </SurfaceCard>
  );
}

function SettingsModal(props: any) {
  const { theme, themeKey, onClose } = props;
  // Flat, light overlay (no glass effect)
  const overlayBg = themeKey === "dark" ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.18)";
  return (
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
        background: overlayBg,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 390 }}>
        <SettingsPanel {...props} />
      </div>
    </div>
  );
}

// -----------------------------
// Home (Toolbox)
// -----------------------------

// Routes: "toolbox" | "beacon_home" | "beacon_app" | "deployment"

function TileButton({ icon, title, subtitle, onClick, theme }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        borderRadius: 18,
        padding: 16,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 10px 26px rgba(0,0,0,0.10)",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div
          style={{
            height: 44,
            width: 44,
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "color-mix(in srgb, var(--accent) 16%, var(--surface))",
            border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))",
          }}
        >
          {icon}
        </div>
        <div
          style={{
            height: 8,
            width: 8,
            borderRadius: 999,
            background: "color-mix(in srgb, var(--accent) 75%, transparent)",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.2, color: theme.text }}>{title}</div>
        <div style={{ fontSize: 13, color: theme.muted, lineHeight: 1.35 }}>{subtitle}</div>
      </div>
    </button>
  );
}

function ToolboxHome({ headerBadge, onOpenBeacon, onOpenDeployment, onOpenSettings, theme }: any) {
  return (
    <>
      <PhoneFrame theme={theme}>
        <Header
          title="Virtual Toolbox"
          subtitle={null}
          leftGlyph={null}
          theme={theme}
          right={
            <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 10, width: "100%" }}>
              <div style={{ alignSelf: "flex-end" }}>{headerBadge}</div>
              <Button
                variant="secondary"
                onClick={onOpenSettings}
                title="Settings"
                style={{ borderColor: theme.border, justifyContent: "flex-start" }}
              >
                <SettingsIcon style={{ height: 16, width: 16, color: theme.accent }} />
                <span style={{ marginLeft: 6 }}>Settings</span>
              </Button>
            </div>
          }
        />

        <SurfaceCard theme={theme} style={{ padding: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, color: theme.muted }}>Choose a tool.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <TileButton
                theme={theme}
                onClick={onOpenBeacon}
                title="Beacon Finder"
                subtitle="Find nearby assets and navigate by distance/trend."
                icon={<Radar style={{ height: 20, width: 20, color: theme.accent }} />}
              />
              <TileButton
                theme={theme}
                onClick={onOpenDeployment}
                title="Asset Deployment"
                subtitle="Scan assets and attach them to tickets/status."
                icon={<ScanLine style={{ height: 20, width: 20, color: theme.accent }} />}
              />
            </div>
          </div>
        </SurfaceCard>

        <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.35 }}>
          Prototype note: Beacon Finder simulates beacon ranging. Asset Deployment simulates barcode scans.
        </div>
      </PhoneFrame>
    </>
  );
}

// -----------------------------
// Beacon Finder – Home (project select)
// -----------------------------

function BeaconHome({ headerBadge, jobsites, selectedMajor, setSelectedMajor, onEnter, onGoToolbox, onOpenSettings, theme }: any) {
  return (
    <>
      <PhoneFrame theme={theme}>
        <Header
          title="Beacon Finder"
          subtitle="Select a jobsite/project to find nearby assets."
          theme={theme}
          right={
            <div className="flex flex-col items-end gap-2 w-full">
              <div className="self-end">{headerBadge}</div>
              <Button variant="secondary" onClick={onGoToolbox} className="w-full justify-start" style={{ borderColor: theme.border }}>
                <Home className="h-4 w-4 mr-2" style={{ color: theme.accent }} /> Home
              </Button>
              <Button variant="secondary" onClick={onOpenSettings} title="Settings" className="w-full justify-start" style={{ borderColor: theme.border }}>
                <SettingsIcon style={{ height: 16, width: 16, color: theme.accent }} />
                <span className="ml-2">Settings</span>
              </Button>
            </div>
          }
        />

        <SurfaceCard theme={theme}>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Project / Jobsite</div>
              <Select value={selectedMajor} onValueChange={setSelectedMajor}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a jobsite" />
                </SelectTrigger>
                <SelectContent>
                  {jobsites.map((j: any) => (
                    <SelectItem key={j.major} value={String(j.major)}>
                      {j.name} (Major {j.major})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs" style={{ color: theme.muted }}>
                You can import assets in Settings before entering a project.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => onEnter(selectedMajor)} disabled={!selectedMajor}>
                Enter project
              </Button>
              <Button variant="secondary" onClick={() => onEnter("all")} style={{ borderColor: theme.border }}>
                View all
              </Button>
            </div>
          </div>
        </SurfaceCard>
      </PhoneFrame>
    </>
  );
}

// -----------------------------
// Beacon Finder – app
// -----------------------------

function NearbyList({ rows, jobsiteName, onFind, theme }: any) {
  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <div className="text-sm" style={{ color: theme.muted }}>
          No assets match the current filter.
        </div>
      ) : (
        rows.map((row) => {
          const feet = ft(row.meters);
          const st = stabilityLabel(row.madMeters);
          const tr = trendLabel(row.deltaMeters);
          const TrendIcon = tr.Icon;

          return (
            <SurfaceCard key={row.key} theme={theme}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-2xl p-2" style={{ border: `1px solid ${theme.border}` }}>
                    <AvatarIcon assetType={row.asset.assetType} theme={theme} />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold">{row.asset.displayName}</div>
                      <Badge variant={st.variant}>{st.label}</Badge>
                      {row.fresh ? <Badge>Live</Badge> : <Badge variant="secondary">Out of range</Badge>}
                    </div>

                    <div className="text-sm" style={{ color: theme.muted }}>
                      {jobsiteName(row.asset.jobsiteMajor)}
                      {row.asset.locationHint ? ` • ${row.asset.locationHint}` : ""}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <div className="font-medium">Distance: {feet == null ? "Unknown" : `${Math.round(feet)} ft`}</div>
                      <div className="flex items-center gap-1" style={{ color: theme.muted }}>
                        <TrendIcon className="h-4 w-4" style={{ color: theme.accent }} /> {tr.label}
                      </div>
                      <div style={{ color: theme.muted }}>Last seen: {row.age == null ? "Never" : `${formatAge(row.age)} ago`}</div>
                    </div>

                    <div className="text-xs" style={{ color: theme.muted }}>
                      Beacon: major {row.beacon.major} • minor {row.beacon.minor} • RSSI {row.rssi ?? "—"} dBm
                    </div>
                  </div>
                </div>

                <Button onClick={() => onFind(row)} className="shrink-0">
                  <ArrowRight className="h-4 w-4 mr-2" /> Find
                </Button>
              </div>
            </SurfaceCard>
          );
        })
      )}
    </div>
  );
}

function FindScreen({ selectedRow, selectedState, onBack, simTargetKey, setSimTargetKey, theme }: any) {
  // Geo-pin emulation: user pins a target position, then distance updates as they walk (GPS-based, best-effort).
  const [geoPos, setGeoPos] = useState(null);
  const [geoPin, setGeoPin] = useState(null);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [geoLastDist, setGeoLastDist] = useState<number | null>(null);
  const [geoDelta, setGeoDelta] = useState<number | null>(null);

  useEffect(() => {
    setGeoErr(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoErr("Geolocation not available in this environment.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        setGeoPos({
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          acc: p.coords.accuracy,
          ts: p.timestamp,
        });
        setGeoErr(null);
      },
      (e) => {
        setGeoErr(e?.message || "Location permission denied or unavailable.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 500,
        timeout: 15000,
      }
    );

    return () => {
      try {
        navigator.geolocation.clearWatch(watchId);
      } catch {
        // ignore
      }
    };
  }, [selectedRow?.key]);

  const geoDist = useMemo(() => {
    const d = haversineMeters(geoPos, geoPin);
    if (d == null) return null;
    if (geoLastDist == null) {
      // initialize on first compute after pin
      return d;
    }
    return d;
  }, [geoPos, geoPin, geoLastDist]);

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

  const pinHere = useCallback(() => {
    if (!geoPos) return;
    setGeoPin({ lat: geoPos.lat, lon: geoPos.lon, ts: nowMs() });
    setGeoLastDist(null);
    setGeoDelta(null);
  }, [geoPos]);

  const clearPin = useCallback(() => {
    setGeoPin(null);
    setGeoLastDist(null);
    setGeoDelta(null);
  }, []);

  const geoTrend = trendLabel(geoDelta);
  const GeoTrendIcon = geoTrend.Icon;

  const selectedFeet = selectedState ? ft(selectedState.emaMeters) : null;
  const st = stabilityLabel(selectedState?.madMeters ?? null);
  const tr = trendLabel(selectedState?.deltaMeters ?? null);
  const TrendIcon = tr.Icon;

  const geoFeet = geoDist == null ? null : ft(geoDist);

  return (
    <SurfaceCard theme={theme}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-lg font-semibold">{selectedRow.asset.displayName}</div>
          <div className="text-sm" style={{ color: theme.muted }}>
            Beacon: major {selectedRow.beacon.major} • minor {selectedRow.beacon.minor}
          </div>
        </div>
        <Button variant="secondary" onClick={onBack} style={{ borderColor: theme.border }}>
          Back
        </Button>
      </div>

      <div className="my-4" style={{ borderTop: `1px solid ${theme.border}` }} />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={st.variant}>{st.label}</Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <TrendIcon className="h-4 w-4" style={{ color: theme.accent }} /> {tr.label}
          </Badge>
        </div>

        <div className="rounded-2xl p-5" style={{ border: `1px solid ${theme.border}` }}>
          <div className="text-sm" style={{ color: theme.muted }}>
            Estimated distance (simulated beacon)
          </div>
          <div className="text-4xl font-semibold tracking-tight">{selectedFeet == null ? "—" : `${Math.round(selectedFeet)} ft`}</div>
          <div className="mt-2 text-sm" style={{ color: theme.muted }}>
            RSSI: {selectedState?.lastRssi ?? "—"} dBm • Updated {selectedState ? formatAge(nowMs() - selectedState.lastSeenMs) : "—"} ago
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}>
          <div className="font-semibold">Geo-pin emulation (no beacons)</div>
          <div className="text-sm mt-1" style={{ color: theme.muted }}>
            Stand where the asset is supposed to be, tap <span style={{ color: theme.text, fontWeight: 600 }}>Pin here</span>, then walk.
            The app will show whether you are getting closer or farther based on GPS location.
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Button onClick={pinHere} disabled={!geoPos}>
              <MapPin className="h-4 w-4 mr-2" style={{ color: theme.accent }} /> Pin here
            </Button>
            <Button variant="secondary" onClick={clearPin} disabled={!geoPin} style={{ borderColor: theme.border }}>
              Clear pin
            </Button>
          </div>

          <div className="mt-3 space-y-1 text-sm" style={{ color: theme.muted }}>
            <div>
              Current: {geoPos ? `${geoPos.lat.toFixed(5)}, ${geoPos.lon.toFixed(5)} (±${Math.round(geoPos.acc || 0)}m)` : "—"}
            </div>
            <div>Pin: {geoPin ? `${geoPin.lat.toFixed(5)}, ${geoPin.lon.toFixed(5)}` : "—"}</div>
            <div className="flex items-center gap-2">
              <div className="font-medium" style={{ color: theme.text }}>
                Distance: {geoFeet == null ? "—" : `${Math.round(geoFeet)} ft`}
              </div>
              <div className="flex items-center gap-1">
                <GeoTrendIcon className="h-4 w-4" style={{ color: theme.accent }} /> {geoTrend.label}
              </div>
            </div>
            {geoErr ? <div className="text-destructive">{geoErr}</div> : null}
          </div>

          <div className="text-xs mt-2" style={{ color: theme.muted }}>
            Note: GPS is coarse indoors; this is a demo-grade emulation until iBeacon is enabled.
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}>
          <div className="font-semibold">Guidance</div>
          <div className="text-sm mt-1" style={{ color: theme.muted }}>
            {st.label === "Unstable"
              ? "Signal is unstable. Step away from rack faces/metal surfaces, hold the phone higher, and move 10–15 ft to re-sample."
              : "Walk steadily and watch the trend. If the distance increases for ~5–10 seconds, turn ~45° and try again."}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant={simTargetKey === selectedRow.key ? "default" : "secondary"} onClick={() => setSimTargetKey(selectedRow.key)}>
            <Radar className="h-4 w-4 mr-2" style={{ color: theme.accent }} /> Simulate walking toward
          </Button>
          <Button variant={simTargetKey == null ? "default" : "secondary"} onClick={() => setSimTargetKey(null)}>
            <RefreshCw className="h-4 w-4 mr-2" style={{ color: theme.accent }} /> Simulate idle
          </Button>
        </div>
      </div>
    </SurfaceCard>
  );
}

function CommissionScreen({ jobsites, commMajor, setCommMajor, commMinor, setCommMinor, commType, setCommType, commTag, setCommTag, onSave, theme }: any) {
  return (
    <SurfaceCard theme={theme}>
      <div className="flex items-center gap-2">
        <QrCode className="h-5 w-5" style={{ color: theme.accent }} />
        <div className="text-lg font-semibold">Commission a beacon to an asset</div>
      </div>

      <div className="text-sm mt-1" style={{ color: theme.muted }}>
        Scan beacon, enter asset type/tag, save mapping.
      </div>

      <div className="my-4" style={{ borderTop: `1px solid ${theme.border}` }} />

      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-2">
          <div className="text-sm font-medium">Jobsite (Major)</div>
          <Select value={String(commMajor)} onValueChange={setCommMajor}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {jobsites.map((j: any) => (
                <SelectItem key={j.major} value={String(j.major)}>
                  {j.name} (Major {j.major})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Beacon Minor</div>
          <Input value={commMinor} onChange={(e) => setCommMinor(e.target.value)} placeholder="e.g., 777" />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Asset type</div>
          <Input value={commType} onChange={(e) => setCommType(e.target.value)} placeholder="Access Point" />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Asset tag</div>
          <Input value={commTag} onChange={(e) => setCommTag(e.target.value)} placeholder="C1234" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <Button onClick={onSave} disabled={!String(commMinor).trim()}>
          Save assignment
        </Button>
        <Badge variant="secondary">UUID fixed (org-wide)</Badge>
      </div>

      <div className="text-xs mt-2" style={{ color: theme.muted }}>
        UUID used: {ORG_UUID}
      </div>
    </SurfaceCard>
  );
}

function BeaconApp({ headerBadge, jobsites, jobsiteMajor, setJobsiteMajor, q, setQ, tab, setTab, simRunning, setSimRunning, onHome, onOpenSettings, rows, onFind, selectedRow, selectedState, onBackFromFind, simTargetKey, setSimTargetKey, commissionProps, jobsiteName, theme }: any) {
  return (
    <>
      <PhoneFrame theme={theme}>
      <div className="space-y-3">
        <Header
          title="Beacon Finder"
          subtitle="Nearby assets → Find view with distance + trend + stability."
          theme={theme}
          right={
            <div className="flex flex-col items-end gap-2 w-full">
              <div className="self-end">{headerBadge}</div>
              <Button variant="secondary" onClick={onHome} className="w-full justify-start" style={{ borderColor: theme.border }}>
                <Home className="h-4 w-4 mr-2" style={{ color: theme.accent }} /> Home
              </Button>
              <Button
                variant="secondary"
                onClick={onOpenSettings}
                title="Settings"
                className="w-full justify-start"
                style={{ borderColor: theme.border }}
              >
                <SettingsIcon style={{ height: 16, width: 16, color: theme.accent }} />
                <span className="ml-2">Settings</span>
              </Button>
              <Button
                variant={simRunning ? "default" : "secondary"}
                onClick={() => setSimRunning((v: boolean) => !v)}
                className="w-full justify-start"
                style={{ borderColor: theme.border }}
              >
                <RefreshCw className="h-4 w-4 mr-2" style={{ color: theme.accent }} /> {simRunning ? "Sim: Running" : "Sim: Paused"}
              </Button>
            </div>
          }
        />

        <SurfaceCard theme={theme}>
          <div className="space-y-3">
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList>
                <TabsTrigger value="nearby">Nearby</TabsTrigger>
                <TabsTrigger value="commission">Commission</TabsTrigger>
                <TabsTrigger value="find" disabled={!selectedRow}>
                  Find
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.muted }} />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: asset tag, type, name, minor…" className="pl-9" />
              </div>

              <Select value={String(jobsiteMajor)} onValueChange={setJobsiteMajor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select jobsite" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All jobsites</SelectItem>
                  {jobsites.map((j: any) => (
                    <SelectItem key={j.major} value={String(j.major)}>
                      {j.name}
                    </SelectItem>
                  ))}
                </SelectContent>
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
              />
            ) : null}

            {tab === "commission" ? <CommissionScreen jobsites={jobsites} {...commissionProps} theme={theme} /> : null}
          </div>
        </SurfaceCard>

        <div className="text-xs" style={{ color: theme.muted }}>
          Note: Web prototype only. Mobile app would use CoreLocation/CoreMotion.
        </div>
      </div>
    </PhoneFrame>
    </>
  );
}

// -----------------------------
// Asset Deployment
// -----------------------------

const STATUS_OPTIONS = ["In Stock", "In Transit", "In Use"];
const LOCATION_OPTIONS = ["Birmingham Office", "Atlanta Office", "Jobsite Location"];



function AssetDeployment({ headerBadge, onHome, onOpenSettings, mode, theme }: any) {
  const [ticket, setTicket] = useState("SR-20498");
  const [scanInput, setScanInput] = useState("");
  const [scanned, setScanned] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("In Use");
  const [location, setLocation] = useState<LocationOpt>("Jobsite Location");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);

  // Camera scanning (best-effort; uses BarcodeDetector when available)
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

  const openCamera = useCallback(async () => {
    setCameraError(null);
    if (typeof window === "undefined") {
      setCameraError("Camera is not available in this environment.");
      return;
    }
    if (!(navigator as any).mediaDevices?.getUserMedia) {
      setCameraError("Camera API not supported in this browser.");
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
          setCameraError(
            "BarcodeDetector is not available in this browser. Use manual entry, or try Chrome on Android. (iOS support varies by version.)"
          );
          return;
        }

        const formats = [
          "qr_code",
          "code_128",
          "code_39",
          "code_93",
          "ean_13",
          "ean_8",
          "upc_a",
          "upc_e",
          "itf",
          "pdf417",
          "data_matrix",
        ];
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
            // ignore transient errors
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

  const removeScan = useCallback((code) => {
    setScanned((prev) => prev.filter((x) => x !== code));
  }, []);

  const lookupTicket = useCallback(async () => {
    setSubmitResult(null);

    if (!ticket.trim()) {
      setLookupResult({ ok: false, message: "Enter a ticket number first." });
      return;
    }

    if (mode === "backend") {
      // Placeholder: expected endpoint contract
      // GET /api/tickets/:ticketNumber -> { ticketNumber, assets: string[] }
      try {
        const r = await fetch(`${API_BASE}/api/tickets/${encodeURIComponent(ticket.trim())}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Ticket lookup failed");
        setLookupResult({ ok: true, message: `Ticket found. Assets attached: ${j.assets?.length ?? 0}.`, assets: j.assets || [] });
      } catch (e) {
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
      // Placeholder: expected endpoint contract
      // POST /api/asset-movements
      // { ticketNumber, barcodes: string[], status, location }
      try {
        const r = await fetch(`${API_BASE}/api/asset-movements`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ticketNumber: t, barcodes: scanned, status, location }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Submission failed");
        setSubmitResult({ ok: true, message: `Submitted. Attached ${j.attached ?? scanned.length} assets and updated status.` });
      } catch (e) {
        setSubmitResult({ ok: false, message: String(e?.message || e) });
      }
      return;
    }

    // Mock behavior:
    const existing = (MOCK.ticketDB as any)[t];
    if (existing == null) {
      setSubmitResult({ ok: false, message: "Ticket not found (mock)." });
      return;
    }

    const merged = Array.from(new Set([...(existing || []), ...scanned]));
    (MOCK.ticketDB as any)[t] = merged;

    setSubmitResult({
      ok: true,
      message: `Submitted (mock). Ticket ${t} now has ${merged.length} asset(s). Status → ${status}. Location → ${location}.`,
    });

    setLookupResult({ ok: true, message: `Ticket found (mock). Assets attached: ${merged.length}.`, assets: merged });
  }, [ticket, scanned, status, location, mode]);

  return (
    <>
      <PhoneFrame theme={theme}>
        <Header
          title="Asset Deployment"
          subtitle="Deploy assets by scanning barcodes and updating ticket, status, and location."
          theme={theme}
          right={
            <div className="flex flex-col items-end gap-2 w-full">
              <div className="self-end">{headerBadge}</div>
              <Button variant="secondary" onClick={onHome} className="w-full justify-start" style={{ borderColor: theme.border }}>
                <Home className="h-4 w-4 mr-2" style={{ color: theme.accent }} /> Home
              </Button>
              <Button
                variant="secondary"
                onClick={onOpenSettings}
                title="Settings"
                className="w-full justify-start"
                style={{ borderColor: theme.border }}
              >
                <SettingsIcon style={{ height: 16, width: 16, color: theme.accent }} />
                <span className="ml-2">Settings</span>
              </Button>
            </div>
          }
        />

        <SurfaceCard theme={theme}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" style={{ color: theme.accent }} />
              <div className="font-semibold">Ticket</div>
            </div>

            <Input value={ticket} onChange={(e: any) => setTicket(e.target.value)} placeholder="e.g., INC-10001" />

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={lookupTicket} style={{ borderColor: theme.border }}>
                Check ticket
              </Button>
            </div>

            {lookupResult ? (
              <div className={`text-sm ${lookupResult.ok ? "" : "text-destructive"}`} style={{ color: lookupResult.ok ? theme.text : undefined }}>
                {lookupResult.message}
              </div>
            ) : null}

            <div className="my-2" style={{ borderTop: `1px solid ${theme.border}` }} />

            <div className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" style={{ color: theme.accent }} />
              <div className="font-semibold">Scan assets</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, color: theme.muted }}>
                Use <span style={{ color: theme.text, fontWeight: 800 }}>Scan with camera</span> for real barcodes, or type one and press Add.
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <Input value={scanInput} onChange={(e: any) => setScanInput(e.target.value)} placeholder="Barcode" />
                </div>
                <Button onClick={addScan} variant="secondary" style={{ borderColor: theme.border }}>
                  <Package className="h-4 w-4" /> Add
                </Button>
              </div>
              <Button onClick={openCamera} style={{ justifyContent: "flex-start" }}>
                <ScanLine className="h-4 w-4" style={{ color: theme.bg }} /> Scan with camera
              </Button>
            </div>

            {scanned.length ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">Scanned ({scanned.length})</div>
                <div className="space-y-2">
                  {scanned.map((code) => (
                    <div key={code} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ border: `1px solid ${theme.border}` }}>
                      <div className="font-medium">{code}</div>
                      <Button variant="secondary" onClick={() => removeScan(code)} style={{ borderColor: theme.border }}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm" style={{ color: theme.muted }}>
                No scanned assets yet.
              </div>
            )}

            <div className="my-2" style={{ borderTop: `1px solid ${theme.border}` }} />

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <div className="text-sm font-medium">Set status</div>
                <Select value={status} onValueChange={setStatus as any}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Set location</div>
                <Select value={location} onValueChange={setLocation as any}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_OPTIONS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <Button onClick={submit}>Submit</Button>
              <Badge variant="secondary">Will attach assets to ticket if missing</Badge>
            </div>

            {submitResult ? (
              <div className={`text-sm ${submitResult.ok ? "" : "text-destructive"}`} style={{ color: submitResult.ok ? theme.text : undefined }}>
                {submitResult.message}
              </div>
            ) : null}

            <div className="text-xs" style={{ color: theme.muted }}>
              Backend note: the real implementation would validate the ticket in your ticketing system and then update asset records.
            </div>
          </div>
        </SurfaceCard>
      </PhoneFrame>

      {cameraOpen ? (
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
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 390 }}>
            <SurfaceCard theme={theme} style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 800 }}>Scan barcode</div>
                <Button variant="secondary" onClick={() => setCameraOpen(false)} style={{ borderColor: theme.border }}>
                  Close
                </Button>
              </div>
              <div style={{ fontSize: 12, color: theme.muted, marginTop: 8 }}>
                Point the camera at the barcode. The first detected code will be added.
              </div>

              <div style={{ marginTop: 12, borderRadius: 16, overflow: "hidden", border: `1px solid ${theme.border}` }}>
                <video ref={videoRef} playsInline muted style={{ width: "100%", height: 360, objectFit: "cover", background: "#000" }} />
              </div>

              {cameraError ? (
                <div style={{ marginTop: 10, fontSize: 13, color: theme.muted }}>{cameraError}</div>
              ) : (
                <div style={{ marginTop: 10, fontSize: 13, color: theme.muted }}>
                  If nothing scans, try more light and move closer/farther.
                </div>
              )}
            </SurfaceCard>
          </div>
        </div>
      ) : null}
    </>
  );
}

// -----------------------------
// Main
// -----------------------------

export default function VirtualToolboxPrototype() {
  const { mode, jobsites, beaconAssets, setBeaconAssets } = useBackendOrMock();

  // Theme
  const [themeKey, setThemeKey] = useState(() => {
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

  const theme = THEMES[themeKey];

  const headerBadge =
    mode === "checking" ? (
      <Badge variant="secondary">Checking backend…</Badge>
    ) : mode === "backend" ? (
      <Badge>Backend connected</Badge>
    ) : (
      <Badge variant="secondary">Mock data</Badge>
    );

  // Routing
  const [route, setRoute] = useState<Route>("toolbox");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Settings import
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState<any>(null);

  // Beacon Finder state
  const [beaconHomeSelectedMajor, setBeaconHomeSelectedMajor] = useState("");
  const [beaconTab, setBeaconTab] = useState("nearby");
  const [beaconJobsiteMajor, setBeaconJobsiteMajor] = useState<string>("all");
  const [beaconQ, setBeaconQ] = useState("");
  const [selectedRow, setSelectedRow] = useState<any>(null);

  // Ranging state
  const [ranged, setRanged] = useState(() => new Map());

  // Simulator
  const [simRunning, setSimRunning] = useState(true);
  const [simTargetKey, setSimTargetKey] = useState(null);
  const simStateRef = useRef({});

  const goToolbox = useCallback(() => {
    // keep module states but return to main menu
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
      const url =
        major === "all"
          ? `${API_BASE}/api/assets`
          : `${API_BASE}/api/assets?major=${encodeURIComponent(String(major))}`;
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
    } catch (e) {
      setImportResult({ ok: false, message: String(e?.message || e) });
    }
  }, [mode, importFile, refreshBeaconAssets]);

  const enterBeaconProject = useCallback(
    (major: string) => {
      setBeaconJobsiteMajor(String(major));
      setRoute("beacon_app");
    },
    [setBeaconJobsiteMajor]
  );

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

  const ingestObservation = useCallback((key, metersVal, rssi) => {
    setRanged((prev) => {
      const next = new Map(prev);
      const curr = next.get(key) || {
        samples: [],
        lastSeenMs: 0,
        emaMeters: null,
        madMeters: null,
        deltaMeters: null,
        lastEmaMeters: null,
        lastRssi: null,
      };

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
    if (route !== "beacon_app") return; // Only simulate while in Beacon Finder app

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
  }, [simRunning, simTargetKey, beaconAssets, beaconJobsiteMajor, ingestObservation, route]);

  const jobsiteName = useCallback(
    (major) => {
      const j = jobsites.find((x: any) => x.major === major);
      return j ? j.name : `Jobsite ${major}`;
    },
    [jobsites]
  );

  const onFind = useCallback((row) => {
    setSelectedRow(row);
    setBeaconTab("find");
    setSimTargetKey(row.key);
  }, []);

  const onBackFromFind = useCallback(() => {
    setSelectedRow(null);
    setBeaconTab("nearby");
    setSimTargetKey(null);
  }, []);

  // Commissioning
  const [commMinor, setCommMinor] = useState("");
  const [commMajor, setCommMajor] = useState("1201");
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

  // Render
  if (route === "toolbox") {
    return (
      <>
        <ToolboxHome
          headerBadge={headerBadge}
          onOpenBeacon={openBeacon}
          onOpenDeployment={openDeployment}
          onOpenSettings={() => setSettingsOpen(true)}
          theme={theme}
        />
        {settingsPanel}
      </>
    );
  }

  if (route === "beacon_home") {
    return (
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
    );
  }

  if (route === "deployment") {
    return (
      <>
        <AssetDeployment
          headerBadge={headerBadge}
          onHome={goToolbox}
          onOpenSettings={() => setSettingsOpen(true)}
          mode={mode}
          theme={theme}
        />
        {settingsPanel}
      </>
    );
  }

  // route === "beacon_app"
  return (
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
  );
}
