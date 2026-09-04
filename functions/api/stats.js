// POST /api/stats  数据看板接口
// 服务端校验管理密码（密码存 Cloudflare Pages 环境变量 STATS_PW，不入代码），返回聚合数据：
// { visits, guestbook, commentCount,
//   totalVisits,   // 总访问次数
//   dailyVisits,   // 每日访问总次数
//   dailyPeople,   // 每日访问总人数（按 IP 去重）
//   totalPeople,   // 访问总人数（按 IP 去重）
//   guestbookCount }
import { checkKV, json, rateLimit, clientIP } from "./_kv.js";

// 按中国时区(UTC+8)取日期 YYYY-MM-DD
function dayKey(ts) {
  return new Date(ts + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

export async function onRequestPost({ request, env }) {
  const bad = checkKV(env);
  if (bad) return bad;

  // 按 IP 限流：同一 IP 每分钟最多 10 次看板请求，防爆破
  const ip = clientIP(request);
  const rlKey = "rl:stats:" + ip;
  const allowed = await rateLimit(env, rlKey, 10, 60);
  if (!allowed) {
    return new Response("too many requests", { status: 429 });
  }

  // 密码从环境变量读取（Cloudflare Pages → Settings → Environment variables → STATS_PW）
  const dashPw = env.STATS_PW || "";
  if (!dashPw) {
    return new Response("server misconfigured: STATS_PW not set", { status: 500 });
  }

  // 用 POST body 传密码，避免密码出现在 URL / 浏览器历史 / 访问日志
  let bodyPw = "";
  try {
    const body = await request.json();
    bodyPw = (body && body.pw) ? String(body.pw) : "";
  } catch (e) { bodyPw = ""; }
  if (!bodyPw || bodyPw !== dashPw) {
    return new Response("unauthorized", { status: 401 });
  }

  const visits = await env.NEWS_KV.get("visits", { type: "json" }) || [];
  const comments = await env.NEWS_KV.get("comments", { type: "json" }) || {};
  const guestbook = await env.NEWS_KV.get("guestbook", { type: "json" }) || [];

  let commentCount = 0;
  for (const k in comments) commentCount += comments[k].length;

  const today = dayKey(Date.now());
  const ipSet = {}, dayIpSet = {};
  let dailyVisits = 0, totalVisits = 0, failedAttempts = 0;
  visits.forEach(function (v) {
    if (v.status === "fail") { failedAttempts++; return; }  // 失败单独统计
    totalVisits++;
    const pip = v.ip || "未知";
    ipSet[pip] = 1;
    if (dayKey(v.time) === today) { dailyVisits++; dayIpSet[pip] = 1; }
  });

  return json({
    visits,
    guestbook,
    commentCount,
    totalVisits: totalVisits,                // 总访问次数（成功）
    dailyVisits: dailyVisits,                // 每日访问总次数
    dailyPeople: Object.keys(dayIpSet).length, // 每日访问总人数
    totalPeople: Object.keys(ipSet).length,  // 访问总人数
    failedAttempts: failedAttempts,          // 密码校验失败次数
    guestbookCount: guestbook.length
  });
}
