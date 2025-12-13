import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const NEYNAR_API_URL = process.env.NEYNAR_API_URL ?? "https://api.neynar.com";

type NeynarUser = {
  fid: number;
  username: string;
  display_name?: string;
  pfp_url?: string;
  follower_count: number;
  following_count: number;
  experimental?: {
    neynar_user_score?: number;
    [key: string]: unknown;
  };
};

type NeynarBulkResponse = {
  users?: NeynarUser[];
};

export async function GET(req: NextRequest) {
  try {
    if (!NEYNAR_API_KEY) {
      return NextResponse.json(
        { error: "Server is missing NEYNAR_API_KEY" },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(req.url);
    const fid = searchParams.get("fid");

    if (!fid) {
      return NextResponse.json(
        { error: "Missing fid query parameter" },
        { status: 400 },
      );
    }

    const url = `${NEYNAR_API_URL}/v2/farcaster/user/bulk?fids=${encodeURIComponent(
      fid,
    )}`;

    const neynarRes = await fetch(url, {
      headers: {
        "x-api-key": NEYNAR_API_KEY,
        "x-neynar-experimental": "true",
      },
      cache: "no-store",
    });

    if (!neynarRes.ok) {
      const text = await neynarRes.text();
      console.error("Neynar error", neynarRes.status, text);
      return NextResponse.json(
        { error: "Failed to fetch user from Neynar" },
        { status: 502 },
      );
    }

    const data = (await neynarRes.json()) as NeynarBulkResponse;
    const user = data?.users?.[0];

    if (!user) {
      return NextResponse.json(
        { error: "User not found for given fid" },
        { status: 404 },
      );
    }

    const response = {
      fid: user.fid,
      username: user.username,
      displayName: user.display_name,
      pfpUrl: user.pfp_url,
      followerCount: user.follower_count,
      followingCount: user.following_count,
      neynarScore:
        typeof user.experimental?.neynar_user_score === "number"
          ? user.experimental.neynar_user_score
          : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
