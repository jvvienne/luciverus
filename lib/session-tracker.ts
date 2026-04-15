import { getRedis } from "./redis";

const SESSION_KEY = "luciverus:session"; // { platform, startedAt }
const HISTORY_KEY = "luciverus:history"; // list of completed streams

interface Session {
  platform: string;
  startedAt: string;
}

interface StreamEntry {
  title: string;
  date: string;
  duration: string;
  platform: string;
}

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h${m}m`;
  return `${m}m`;
}

export async function trackLiveStatus(
  platform: string,
  isLive: boolean,
  title?: string
) {
  const redis = getRedis();
  const raw = await redis.get(SESSION_KEY);
  const session: Session | null = raw ? JSON.parse(raw) : null;

  if (isLive && !session) {
    // Going live — start session
    await redis.set(
      SESSION_KEY,
      JSON.stringify({ platform, startedAt: new Date().toISOString() })
    );
  } else if (isLive && session && session.platform !== platform) {
    // Switched platforms mid-stream — close old, start new
    await finalizeSession(session, "Live stream");
    await redis.set(
      SESSION_KEY,
      JSON.stringify({ platform, startedAt: new Date().toISOString() })
    );
  } else if (!isLive && session && session.platform === platform) {
    // Went offline on the platform that was live
    await finalizeSession(session, title || "Live stream");
  }
}

async function finalizeSession(session: Session, title: string) {
  const redis = getRedis();
  const duration = formatDuration(
    Date.now() - new Date(session.startedAt).getTime()
  );

  const entry: StreamEntry = {
    title,
    date: session.startedAt,
    duration,
    platform: session.platform,
  };

  // Prepend to history list, keep last 50
  await redis.lpush(HISTORY_KEY, JSON.stringify(entry));
  await redis.ltrim(HISTORY_KEY, 0, 49);
  await redis.del(SESSION_KEY);
}

export async function getStreamHistory(): Promise<StreamEntry[]> {
  const redis = getRedis();
  const [entries, raw] = await Promise.all([
    redis.lrange(HISTORY_KEY, 0, 49),
    redis.get(SESSION_KEY),
  ]);

  const history: StreamEntry[] = entries.map((e) => JSON.parse(e));
  const session: Session | null = raw ? JSON.parse(raw) : null;

  // If currently live, include active session at top
  if (session) {
    const duration = formatDuration(
      Date.now() - new Date(session.startedAt).getTime()
    );
    history.unshift({
      title: "Live now",
      date: session.startedAt,
      duration,
      platform: session.platform,
    });
  }

  return history;
}
