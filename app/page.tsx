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

const PLATFORM_URLS: Record<string, string> = {
  twitch: "https://www.twitch.tv/mamiluciverus",
  tiktok: "https://www.tiktok.com/@lcverus",
};

function StatusPill({ status }: { status: PlatformStatus }) {
  const label = status.platform === "twitch" ? "twitch" : "tiktok";
  const url = PLATFORM_URLS[status.platform];

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-center gap-3 px-5 py-3 rounded-full border backdrop-blur-sm transition-all duration-300 hover:scale-105 ${
        status.live
          ? "border-purple-500/30 bg-purple-500/[0.08] shadow-[0_0_20px_rgba(168,85,247,0.25),0_0_60px_rgba(168,85,247,0.1)] hover:shadow-[0_0_25px_rgba(168,85,247,0.35),0_0_80px_rgba(168,85,247,0.15)] hover:border-purple-400/40"
          : "border-white/10 bg-white/[0.04] hover:border-purple-500/30 hover:bg-white/[0.08]"
      }`}
    >
      <span className="relative flex h-2 w-2">
        {status.live && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            status.live ? "bg-purple-400" : "bg-neutral-600"
          }`}
        />
      </span>
      <span className="text-sm font-mono tracking-wider text-neutral-400 group-hover:text-neutral-200 transition-colors duration-300">
        {label}
      </span>
      <span
        className="text-xs font-mono tracking-widest uppercase"
        style={{ color: status.live ? "#c084fc" : "#444" }}
      >
        {status.live ? "live" : "off"}
      </span>
      <span className="text-neutral-700 text-xs transition-all duration-300 group-hover:text-purple-400 group-hover:translate-x-0.5 ml-auto">
        &rarr;
      </span>
    </a>
  );
}

export default function Home() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const simulate = params.get("simulate");
      const apiUrl = simulate ? `/api/status?simulate=${simulate}` : "/api/status";
      const res = await fetch(apiUrl);
      const data: StatusResponse = await res.json();
      setStatus(data);
    } catch {
      // silent fail, keep last known status
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return (
    <main className="flex-1 flex items-center justify-center p-6 relative">
      <div className={`glow-bg ${status?.tiktok.live || status?.twitch.live ? "glow-live" : ""}`} />
      <div className="relative z-10 flex flex-col items-center gap-10">
        <div className="text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.15em" }}>
            LUCIVERUS
          </h1>
          <p className="text-neutral-600 text-xs font-mono tracking-[0.3em] mt-3 uppercase">
            streaming is a maybe
          </p>
        </div>

        {loading ? (
          <div className="text-neutral-600 font-mono text-xs animate-pulse tracking-widest">
            checking...
          </div>
        ) : status ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <StatusPill status={status.tiktok} />
            <StatusPill status={status.twitch} />
          </div>
        ) : null}

        {status?.checkedAt && (
          <p className="text-neutral-500 text-xs font-mono tracking-wider">
            last checked: {new Date(status.checkedAt).toLocaleTimeString()} &middot; refreshes every 30s
          </p>
        )}
      </div>
    </main>
  );
}
