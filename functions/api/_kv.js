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
