// GET /api/stats?pw=liulaoshi
// 服务端校验管理密码，返回聚合数据：
// { visits, guestbook, commentCount, totalVisits, memberCount, guestbookCount }
import { checkKV, json } from "./_kv.js";

const DASH_PW = "liulaoshi";

export async function onRequestGet({ request, env }) {
  const bad = checkKV(env);
  if (bad) return bad;

  const url = new URL(request.url);
  if (url.searchParams.get("pw") !== DASH_PW) {
    return new Response("unauthorized", { status: 401 });
  }

  const visits = await env.NEWS_KV.get("visits", { type: "json" }) || [];
  const comments = await env.NEWS_KV.get("comments", { type: "json" }) || {};
  const guestbook = await env.NEWS_KV.get("guestbook", { type: "json" }) || [];

  let commentCount = 0;
  for (const k in comments) commentCount += comments[k].length;

  const memberMap = {};
  visits.forEach((v) => { memberMap[v.name] = (memberMap[v.name] || 0) + 1; });

  return json({
    visits,
    guestbook,
    commentCount,
    totalVisits: visits.length,
    memberCount: Object.keys(memberMap).length,
    guestbookCount: guestbook.length
  });
}
