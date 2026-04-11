interface TwitchTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
}

interface TwitchVideo {
  id: string;
  title: string;
  created_at: string;
  duration: string;
  type: string;
}

import { getTikTokHistory } from "@/lib/tiktok-tracker";

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

export const dynamic = "force-dynamic";

export async function GET() {
  const username = process.env.TWITCH_USERNAME;
  if (!username) {
    return Response.json({ streams: [] });
  }

  try {
    const token = await getTwitchToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Client-Id": process.env.TWITCH_CLIENT_ID!,
    };

    // Get user ID
    const userRes = await fetch(
      `https://api.twitch.tv/helix/users?login=${username}`,
      { headers }
    );
    const userData: { data: TwitchUser[] } = await userRes.json();
    const userId = userData.data?.[0]?.id;
    if (!userId) return Response.json({ streams: [] });

    // Get past broadcasts
    const videosRes = await fetch(
      `https://api.twitch.tv/helix/videos?user_id=${userId}&type=archive&first=10`,
      { headers }
    );
    const videosData: { data: TwitchVideo[] } = await videosRes.json();

    const tiktokStreams = getTikTokHistory();

    // TODO: re-enable Twitch history once real streams start
    // For now, only show TikTok history (existing Twitch VODs are test streams)
    const streams = [...tiktokStreams].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return Response.json(
      { streams },
      { headers: { "Cache-Control": "public, max-age=300" } }
    );
  } catch {
    // Even if Twitch fails, still return TikTok history
    const tiktokStreams = getTikTokHistory();
    return Response.json({ streams: tiktokStreams });
  }
}
