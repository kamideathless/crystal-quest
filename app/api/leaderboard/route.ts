import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const KEY = "leaderboard:v1"; // Sorted Set

function normalizeNick(raw: string) {
  return raw.trim().slice(0, 20);
}

function parseZrangeWithScores(result: any): { nickname: string; score: number }[] {
  const rows: { nickname: string; score: number }[] = [];
  if (!Array.isArray(result)) return rows;

  // objects: [{member, score}]
  if (result.length && typeof result[0] === "object" && !Array.isArray(result[0])) {
    for (const r of result) {
      if (r?.member != null && r?.score != null) rows.push({ nickname: String(r.member), score: Number(r.score) });
    }
    return rows;
  }

  // pairs: [[member, score]]
  if (result.length && Array.isArray(result[0])) {
    for (const p of result) {
      if (Array.isArray(p) && p.length >= 2) rows.push({ nickname: String(p[0]), score: Number(p[1]) });
    }
    return rows;
  }

  // flat: [member, score, member, score...]
  for (let i = 0; i < result.length; i += 2) {
    rows.push({ nickname: String(result[i]), score: Number(result[i + 1]) });
  }
  return rows;
}

export async function GET() {
  const raw = await kv.zrange(KEY, 0, 19, { rev: true, withScores: true });
  return NextResponse.json({ rows: parseZrangeWithScores(raw) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad JSON" }, { status: 400 });

  const nickname = normalizeNick(String(body.nickname ?? ""));
  const score = Math.floor(Number(body.score));

  if (nickname.length < 2) return NextResponse.json({ error: "Nickname too short" }, { status: 400 });
  if (!Number.isFinite(score) || score < 0 || score > 1_000_000)
    return NextResponse.json({ error: "Invalid score" }, { status: 400 });

  // Сохраняем лучший результат для ника
  const current = await kv.zscore(KEY, nickname);
  if (current === null || score > Number(current)) {
    await kv.zadd(KEY, { score, member: nickname });
  }

  return NextResponse.json({ ok: true });
}
