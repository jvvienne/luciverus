import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const HISTORY_FILE = join(DATA_DIR, "tiktok-history.json");
const SESSION_FILE = join(DATA_DIR, "tiktok-session.json");

interface TikTokSession {
  startedAt: string;
}

interface TikTokStream {
  title: string;
  date: string;
  duration: string;
  platform: "tiktok";
}

function readJSON<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJSON(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h${m}m`;
  return `${m}m`;
}

export function trackTikTokStatus(isLive: boolean) {
  const session = readJSON<TikTokSession | null>(SESSION_FILE, null);

  if (isLive && !session) {
    // Going live — start a new session
    writeJSON(SESSION_FILE, { startedAt: new Date().toISOString() });
  } else if (!isLive && session) {
    // Went offline — finalize the session
    const start = new Date(session.startedAt).getTime();
    const duration = formatDuration(Date.now() - start);

    const history = readJSON<TikTokStream[]>(HISTORY_FILE, []);
    history.unshift({
      title: "TikTok Live",
      date: session.startedAt,
      duration,
      platform: "tiktok",
    });
    // Keep last 50 entries
    writeJSON(HISTORY_FILE, history.slice(0, 50));
    // Clear active session
    writeJSON(SESSION_FILE, null);
  }
}

export function getTikTokHistory(): TikTokStream[] {
  const history = readJSON<TikTokStream[]>(HISTORY_FILE, []);
  const session = readJSON<TikTokSession | null>(SESSION_FILE, null);

  // If currently live, include the active session
  if (session) {
    const duration = formatDuration(Date.now() - new Date(session.startedAt).getTime());
    return [
      { title: "TikTok Live", date: session.startedAt, duration, platform: "tiktok" },
      ...history,
    ];
  }
  return history;
}
