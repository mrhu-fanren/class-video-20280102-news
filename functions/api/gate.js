// POST /api/gate  body {pw}
// 服务端校验访问密码，并记录一次到访：{ip, time, status:"ok"|"fail"}
// 密码只存在于服务端，不暴露给前端，提升安全性、避免被盗。
import { checkKV, json, clientIP } from "./_kv.js";

const PASSWORD = "20280102";   // 访问密码（仅服务端持有）

const MAX_FAILS = 5;           // 连续失败上限
const LOCK_MS = 60 * 1000;     // 锁定 60 秒

export async function onRequestPost({ request, env }) {
  const bad = checkKV(env);
  if (bad) return bad;

  const ip = clientIP(request);
  const lockKey = "lock:gate:" + ip;
  const failKey = "fail:gate:" + ip;

  // 1) 检查是否处于锁定状态
  let lockUntil = 0;
  try {
    const raw = await env.NEWS_KV.get(lockKey);
    if (raw) lockUntil = parseInt(raw, 10) || 0;
  } catch (e) { lockUntil = 0; }
  if (Date.now() < lockUntil) {
    const wait = Math.ceil((lockUntil - Date.now()) / 1000);
    return json({ ok: false, locked: true, waitSec: wait }, 429);
  }

  const body = await request.json().catch(() => ({}));
  const ok = String(body.pw || "") === PASSWORD;

  // 2) 失败：累加计数，达上限即锁定（带 TTL 自动过期）
  if (!ok) {
    let fails = 0;
    try {
      fails = parseInt(await env.NEWS_KV.get(failKey), 10) || 0;
    } catch (e) { fails = 0; }
    fails += 1;
    try {
      await env.NEWS_KV.put(failKey, String(fails), { expirationTtl: LOCK_MS / 1000 + 60 });
    } catch (e) {}
    if (fails >= MAX_FAILS) {
      try {
        await env.NEWS_KV.put(lockKey, String(Date.now() + LOCK_MS), { expirationTtl: LOCK_MS / 1000 + 60 });
        await env.NEWS_KV.delete(failKey);
      } catch (e) {}
      return json({ ok: false, locked: true, waitSec: Math.ceil(LOCK_MS / 1000) }, 429);
    }
    // 成功过也清零：仅连续失败才累计
  } else {
    try { await env.NEWS_KV.delete(failKey); } catch (e) {}
  }

  // 3) 记录到访（成功/失败均记录，供看板统计）
  const list = await env.NEWS_KV.get("visits", { type: "json" }) || [];
  list.push({ ip: String(ip).slice(0, 45), time: Date.now(), status: ok ? "ok" : "fail" });
  if (list.length > 5000) list.splice(0, list.length - 5000);
  try {
    await env.NEWS_KV.put("visits", JSON.stringify(list));
  } catch (e) { /* 记录失败不阻断校验结果 */ }

  return json({ ok });
}
