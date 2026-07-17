// GET /api/stats?pw=liulaoshi
// 服务端校验管理密码，返回聚合数据（仅基于访客 IP + 时间，不涉姓名）：
// { visits, guestbook, commentCount,
//   totalVisits,   // 总访问次数
//   dailyVisits,   // 每日访问总次数
//   dailyPeople,   // 每日访问总人数（按 IP 去重）
//   totalPeople,   // 访问总人数（按 IP 去重）
//   guestbookCount }
import { checkKV, json } from "./_kv.js";

const DASH_PW = "liulaoshi";

// 按中国时区(UTC+8)取日期 YYYY-MM-DD
function dayKey(ts) {
  return new Date(ts + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

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

  const today = dayKey(Date.now());
  const ipSet = {}, dayIpSet = {};
  let dailyVisits = 0, totalVisits = 0, failedAttempts = 0;
  visits.forEach(function (v) {
    if (v.status === "fail") { failedAttempts++; return; }  // 失败单独统计
    totalVisits++;
    const ip = v.ip || "未知";
    ipSet[ip] = 1;
    if (dayKey(v.time) === today) { dailyVisits++; dayIpSet[ip] = 1; }
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
