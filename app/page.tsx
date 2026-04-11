"use client";

import { useEffect, useState, useCallback } from "react";

interface PlatformStatus {
  live: boolean;
  platform: string;
  title?: string;
  viewers?: number;
  game?: string;
}

interface StatusResponse {
  twitch: PlatformStatus;
  tiktok: PlatformStatus;
  checkedAt: string;
}

interface StreamHistory {
  title: string;
  date: string;
  duration: string;
  platform: string;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thenStart = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const daysDiff = Math.round((todayStart.getTime() - thenStart.getTime()) / 86_400_000);
  if (daysDiff === 0) return "today";
  if (daysDiff === 1) return "yesterday";
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  if (daysDiff < 7) return dayNames[then.getDay()];
  if (daysDiff < 14) return "last week";
  return `${Math.floor(daysDiff / 7)} weeks ago`;
}

function parseDuration(dur: string): string {
  const h = dur.match(/(\d+)h/)?.[1];
  const m = dur.match(/(\d+)m/)?.[1];
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  if (m) return `${m}m`;
  return dur;
}

const PLATFORM_URLS: Record<string, string> = {
  twitch: "https://www.twitch.tv/mamiluciverus",
  tiktok: "https://www.tiktok.com/@lcverus",
};

function useTextDecode(text: string, active: boolean, duration = 1500) {
  const [displayed, setDisplayed] = useState(text);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  useEffect(() => {
    if (!active) { setDisplayed(text); return; }
    let frame = 0;
    const totalFrames = Math.ceil(duration / 30);
    const interval = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const decoded = text.split("").map((char, i) => {
        if (char === " ") return " ";
        if (i / text.length < progress) return char;
        return chars[Math.floor(Math.random() * chars.length)];
      }).join("");
      setDisplayed(decoded);
      if (frame >= totalFrames) { clearInterval(interval); setDisplayed(text); }
    }, 30);
    return () => clearInterval(interval);
  }, [text, active, duration]);
  return displayed;
}

function StatusPill({ status }: { status: PlatformStatus }) {
  const label = status.platform === "twitch" ? "twitch" : "tiktok";
  const url = PLATFORM_URLS[status.platform];

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="group relative">
      <div className={`relative flex items-center gap-3 px-6 py-3 rounded-full border transition-all duration-500 overflow-hidden ${
        status.live
          ? "border-violet-400/25 bg-violet-500/[0.06] hover:bg-violet-500/[0.1] hover:border-violet-400/35 hover:shadow-[0_0_25px_rgba(167,139,250,0.12)] hover:scale-[1.02] live-pill-pulse"
          : "border-white/[0.06] bg-white/[0.02] hover:border-violet-400/20 hover:bg-white/[0.04] hover:scale-[1.02]"
      }`}>
        {/* Shine sweep on hover */}
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

        <span className="relative flex h-1.5 w-1.5">
          {status.live && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-60" />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 transition-colors duration-500 ${
            status.live ? "bg-violet-400" : "bg-white/10 group-hover:bg-violet-400/30"
          }`} />
        </span>
        <span className="text-[11px] tracking-[0.2em] transition-colors duration-500" style={{
          fontFamily: "var(--font-display)",
          color: status.live ? "rgba(167, 139, 250, 0.95)" : "rgba(255,255,255,0.45)",
        }}>
          {label}
        </span>
        <span className="text-[9px] font-mono tracking-wider uppercase transition-colors duration-500" style={{
          color: status.live ? "rgba(167, 139, 250, 0.7)" : "rgba(255,255,255,0.25)",
        }}>
          {status.live ? "live" : "off"}
        </span>

        {/* Hover arrow */}
        <span className="text-white/0 group-hover:text-white/20 text-[10px] transition-all duration-300 group-hover:translate-x-0.5 ml-1">
          &#8594;
        </span>
      </div>

      {/* Tooltip on hover */}
      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:-bottom-7 whitespace-nowrap" style={{
        color: status.live ? "rgba(167, 139, 250, 0.5)" : "rgba(255,255,255,0.2)",
      }}>
        {status.live ? "watch now" : `go to ${label}`}
      </span>
    </a>
  );
}

export default function Home() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<StreamHistory[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isLive = status?.tiktok.live || status?.twitch.live;
  const titleText = useTextDecode("LUCIVERUS", mounted, 1800);

  // Update tab title and favicon when live
  useEffect(() => {
    if (isLive) {
      document.title = "LIVE — Luciverus";
    } else {
      document.title = "Luciverus — Stream Status";
    }
  }, [isLive]);

  const fetchStatus = useCallback(async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const simulate = params.get("simulate");
      const apiUrl = simulate ? `/api/status?simulate=${simulate}` : "/api/status";
      const res = await fetch(apiUrl);
      const data: StatusResponse = await res.json();
      setStatus(data);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    fetch("/api/history").then((r) => r.json()).then((data) => setHistory(data.streams || [])).catch(() => {});
  }, []);
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return (
    <>
    {/* Background — intensifies when live */}
    <div className={`bg-glow transition-opacity duration-1000 ${isLive ? "opacity-100" : ""}`} />
    {isLive && <div className="bg-glow-live" />}

    <main className="min-h-screen flex flex-col items-center justify-center p-8 relative z-10">
      <div className="flex flex-col items-center gap-10 max-w-lg w-full">

        {/* Name */}
        <h1
          className={`text-4xl md:text-5xl font-light tracking-[0.3em] page-enter ${isLive ? "title-shimmer-live" : "title-shimmer"}`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {titleText}
        </h1>

        {/* Status */}
        <div className="page-enter-delay-1">
        {loading ? (
          <div className="text-white/35 font-mono text-xs tracking-[0.3em] cursor-blink">
            CHECKING
          </div>
        ) : status ? (
          <div className="flex gap-3">
            <StatusPill status={status.tiktok} />
            <StatusPill status={status.twitch} />
          </div>
        ) : null}
        </div>

        {/* Bottom info */}
        <div className="flex flex-col items-center gap-5 page-enter-delay-2">
          {status?.checkedAt && (
            <p className="text-white/35 text-xs font-mono tracking-[0.15em]">
              last checked {new Date(status.checkedAt).toLocaleTimeString()} · refreshes every 30s
            </p>
          )}

          {history.length > 0 && (
            <div className="flex flex-col items-center">
              <button
                onClick={() => setHistoryOpen(!historyOpen)}
                className="text-white/30 hover:text-violet-400/50 text-xs font-mono tracking-[0.15em] transition-colors duration-500 cursor-pointer"
              >
                {historyOpen ? "close" : "stream history"}
              </button>

              <div className={`overflow-hidden transition-all duration-700 ease-in-out ${
                historyOpen ? "max-h-96 opacity-100 mt-5" : "max-h-0 opacity-0"
              }`}>
                <div className="flex flex-col gap-1">
                  {history.slice(0, 5).map((s, i) => (
                    <div
                      key={i}
                      className="fade-in-item flex items-center gap-3 text-[11px] font-mono py-1.5 px-3 -mx-3 rounded-lg transition-all duration-300 hover:bg-white/[0.02] cursor-default group/row"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      {/* Platform dot */}
                      <span className={`w-1 h-1 rounded-full shrink-0 ${
                        s.platform === "tiktok" ? "bg-violet-400/50" : "bg-white/20"
                      }`} />
                      <span className="text-white/30 w-16 text-right shrink-0 group-hover/row:text-white/45 transition-colors duration-300">{timeAgo(s.date)}</span>
                      <span className={`truncate max-w-44 transition-colors duration-300 ${
                        s.platform === "tiktok" ? "text-violet-400/45 group-hover/row:text-violet-400/70" : "text-white/35 group-hover/row:text-white/55"
                      }`}>
                        {s.title}
                      </span>
                      <span className="text-white/25 ml-auto shrink-0 group-hover/row:text-white/40 transition-colors duration-300">{parseDuration(s.duration)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
    </>
  );
}
