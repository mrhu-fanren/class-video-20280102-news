// GET /api/visits  -> 返回全部到访记录 [{ip, time, status}]
// （注：POST 写记录已在 /api/gate 中统一处理；这里不再提供 POST，
//   避免无鉴权的死端点被滥用灌数据）
import { checkKV, json } from "./_kv.js";

export async function onRequestGet({ env }) {
  const bad = checkKV(env);
  if (bad) return bad;
  const list = await env.NEWS_KV.get("visits", { type: "json" }) || [];
  return json(list);
}
