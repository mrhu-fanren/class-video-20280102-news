// GET  /api/visits  -> 返回全部到访记录 [{name, time}]
// POST /api/visits  -> body {name} 追加一条到访记录
export async function onRequestGet({ env }) {
  const list = await env.NEWS_KV.get("visits", { type: "json" }) || [];
  return Response.json(list);
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  if (!body.name) return new Response("name required", { status: 400 });
  const list = await env.NEWS_KV.get("visits", { type: "json" }) || [];
  list.push({ name: String(body.name).slice(0, 20), time: Date.now() });
  await env.NEWS_KV.put("visits", JSON.stringify(list));
  return Response.json({ ok: true });
}
