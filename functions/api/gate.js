// POST /api/gate  body {pw}
// 服务端校验访问密码，并记录一次到访：{ip, time, status:"ok"|"fail"}
// 密码只存在于服务端，不暴露给前端，提升安全性、避免被盗。
import { checkKV, json } from "./_kv.js";

const PASSWORD = "20280102";   // 访问密码（仅服务端持有）

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

export async function onRequestPost({ request, env }) {
  const bad = checkKV(env);
  if (bad) return bad;

  const body = await request.json().catch(() => ({}));
  const ok = String(body.pw || "") === PASSWORD;
  const ip = getClientIP(request);

  const list = await env.NEWS_KV.get("visits", { type: "json" }) || [];
  list.push({ ip: String(ip).slice(0, 45), time: Date.now(), status: ok ? "ok" : "fail" });
  // 防止记录无限膨胀：只保留最近 5000 条
  if (list.length > 5000) list.splice(0, list.length - 5000);
  await env.NEWS_KV.put("visits", JSON.stringify(list));

  return json({ ok });
}
