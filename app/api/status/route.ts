interface TwitchTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface TwitchStream {
  user_login: string;
  type: string;
  title: string;
  viewer_count: number;
  game_name: string;
}

interface TwitchStreamsResponse {
  data: TwitchStream[];
}

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getTwitchToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      grant_type: "client_credentials",
    }),
  });

  const data: TwitchTokenResponse = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000 - 60_000;
  return cachedToken;
}

async function checkTwitch() {
  const username = process.env.TWITCH_USERNAME;
  if (!username) return { live: false, platform: "twitch" as const, error: "TWITCH_USERNAME not set" };

  try {
    const token = await getTwitchToken();
    const res = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${username}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Client-Id": process.env.TWITCH_CLIENT_ID!,
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return { live: false, platform: "twitch" as const, error: `Twitch API ${res.status}: ${text}` };
    }

    const data = await res.json();
    const stream = data.data?.[0];

    if (stream) {
      return {
        live: true,
        platform: "twitch" as const,
        title: stream.title,
        viewers: stream.viewer_count,
        game: stream.game_name,
      };
    }
    return { live: false, platform: "twitch" as const, debug: { username, responseKeys: Object.keys(data), dataLength: data.data?.length } };
  } catch (e) {
    return { live: false, platform: "twitch" as const, error: String(e) };
  }
}

async function checkTikTok() {
  const username = process.env.TIKTOK_USERNAME;
  if (!username) return { live: false, platform: "tiktok" as const };

  try {
    const res = await fetch(`https://www.tiktok.com/@${username}/live`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const html = await res.text();

    // TikTok live pages contain LiveRoom data when the user is actually live
    const isLive =
      html.includes('"liveRoom"') &&
      !html.includes('"status":4') &&
      (html.includes('"status":2') || html.includes('"status":1'));

    return { live: isLive, platform: "tiktok" as const };
  } catch {
    return { live: false, platform: "tiktok" as const };
  }
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const simulate = url.searchParams.get("simulate");

  if (simulate) {
    const platforms = simulate.split(",");
    return Response.json(
      {
        twitch: {
          live: platforms.includes("twitch") || platforms.includes("live"),
          platform: "twitch",
          ...(platforms.includes("twitch") || platforms.includes("live")
            ? { title: "late night vibes w/ chat", viewers: 342, game: "Just Chatting" }
            : {}),
        },
        tiktok: {
          live: platforms.includes("tiktok") || platforms.includes("live"),
          platform: "tiktok",
        },
        checkedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const [twitch, tiktok] = await Promise.all([checkTwitch(), checkTikTok()]);

  return Response.json(
    { twitch, tiktok, checkedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
