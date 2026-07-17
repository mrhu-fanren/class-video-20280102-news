// GET  /api/visits  -> 返回全部到访记录 [{ip, time}]
// POST /api/visits  -> 服务端读取访客 IP，追加一条 {ip, time}（不记录姓名）
import { checkKV, json } from "./_kv.js";

// 从请求头中取出访客真实 IP（Cloudflare 环境用 CF-Connecting-IP）
function getClientIP(request) {
  const cf = request.headers.get("CF-Connecting-IP");
  if (cf) return cf;
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xr = request.headers.get("x-real-ip");
  if (xr) return xr;
  return "未知";
}

export async function onRequestGet({ env }) {
  const bad = checkKV(env);
  if (bad) return bad;
  const list = await env.NEWS_KV.get("visits", { type: "json" }) || [];
  return json(list);
}

export async function onRequestPost({ request, env }) {
  const bad = checkKV(env);
  if (bad) return bad;
  const ip = getClientIP(request);
  const list = await env.NEWS_KV.get("visits", { type: "json" }) || [];
  list.push({ ip: String(ip).slice(0, 45), time: Date.now() });
  await env.NEWS_KV.put("visits", JSON.stringify(list));
  return json({ ok: true });
}
