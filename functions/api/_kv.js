// 后端函数共享工具：JSON 响应 + KV 绑定检查
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export function checkKV(env) {
  if (!env || !env.NEWS_KV) {
    return json({ ok: false, error: "KV binding NEWS_KV not found" }, 503);
  }
}

// 简单按 IP 频率限制：同一 key 在 windowSec 秒内最多 max 次，超出返回 false
// 依赖 KV 绑定；用于评论/留言防刷。
export async function rateLimit(env, key, max, windowSec) {
  const now = Date.now();
  let data = await env.NEWS_KV.get(key, { type: "json" });
  if (!data || now - data.start > windowSec * 1000) {
    data = { count: 0, start: now };
  }
  if (data.count >= max) return false;
  data.count += 1;
  await env.NEWS_KV.put(key, JSON.stringify(data), { expirationTtl: windowSec + 120 });
  return true;
}

// 从请求头取访客真实 IP（Cloudflare 边缘注入）
export function clientIP(request) {
  return request.headers.get("CF-Connecting-IP")
    || request.headers.get("x-forwarded-for")
    || request.headers.get("x-real-ip")
    || "unknown";
}
