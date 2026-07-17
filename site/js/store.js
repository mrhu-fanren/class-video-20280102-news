// ============================================================
// 初2028届2班 · 新闻电台 — 数据层
// 优先调用 Cloudflare Pages Functions (/api/*) 实现跨设备汇总；
// 若后端不可用（纯静态/本地预览），自动回退到浏览器本地存储。
// 切换后端无需改动任何页面代码。
// ============================================================
window.Store = (function () {
  // 清理旧版遗留的「记住昵称」数据（曾默认带出姓名，现统一匿名）
  try { localStorage.removeItem("class2news_name"); } catch (e) {}

  const K = {
    visits: "class2news_visits",
    comments: "class2news_comments",
    guestbook: "class2news_guestbook"
  };

  function readLocal(key, def) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? def : v; }
    catch (e) { return def; }
  }
  function writeLocal(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  // 调用后端；网络/服务器不可用时返回 undefined（表示"无后端"）
  async function tryApi(path, opts) {
    try {
      const res = await fetch(path, Object.assign({ headers: { "Content-Type": "application/json" } }, opts || {}));
      if (!res.ok) throw new Error("HTTP " + res.status);
      const ct = res.headers.get("content-type") || "";
      return ct.includes("application/json") ? await res.json() : null;
    } catch (e) { return undefined; }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }
  function fmt(t) {
    const d = new Date(t);
    const p = function (x) { return String(x).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
           " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  // 按中国时区(UTC+8)取日期 YYYY-MM-DD，用于"每日"统计
  function dayKey(ts) {
    return new Date(ts + 8 * 3600 * 1000).toISOString().slice(0, 10);
  }
  // 由到访记录(含 {ip,time,status}) 计算访问指标
  // 仅「成功」记录计入访问量，「失败」单独统计为密码错误次数
  function computeVisitStats(visits, guestbook, commentCount) {
    const today = dayKey(Date.now());
    const ipSet = {}, dayIpSet = {};
    let dailyVisits = 0, totalVisits = 0, failedAttempts = 0;
    visits.forEach(function (v) {
      if (v.status === "fail") { failedAttempts++; return; }
      totalVisits++;
      const ip = v.ip || "未知";
      ipSet[ip] = 1;
      if (dayKey(v.time) === today) { dailyVisits++; dayIpSet[ip] = 1; }
    });
    return {
      visits: visits,
      guestbook: guestbook,
      commentCount: commentCount,
      totalVisits: totalVisits,          // 总访问次数（成功）
      dailyVisits: dailyVisits,          // 每日访问总次数
      dailyPeople: Object.keys(dayIpSet).length, // 每日访问总人数
      totalPeople: Object.keys(ipSet).length,     // 访问总人数
      failedAttempts: failedAttempts,    // 密码校验失败次数
      guestbookCount: (guestbook || []).length
    };
  }

  return {
    // ---- 密码校验（后端优先，避免密码暴露于前端）----
    // 返回 true=通过 / false=不通过。同时由服务端记录 IP+时间+状态。
    // 无后端（本地预览）时回退到前端 localPw 校验，并在本地记录状态。
    verifyGate: async function (pw, localPw) {
      const r = await tryApi("/api/gate", { method: "POST", body: JSON.stringify({ pw: pw }) });
      if (r === undefined) {
        // 无后端：本地校验 + 本地记录（带状态）
        const ok = (pw === localPw);
        const v = readLocal(K.visits, []);
        v.push({ ip: "本地预览", time: Date.now(), status: ok ? "ok" : "fail" });
        writeLocal(K.visits, v);
        return ok;
      }
      return !!(r && r.ok);
    },
    getVisits: async function () {
      const r = await tryApi("/api/visits");
      return r !== undefined ? r : readLocal(K.visits, []);
    },

    // ---- 视频评论（姓名可选，留空则匿名）----
    addComment: async function (vid, text, name) {
      const nm = (name || "").trim();
      const r = await tryApi("/api/comments", { method: "POST", body: JSON.stringify({ vid: vid, name: nm, text: text }) });
      if (r === undefined) {
        const all = readLocal(K.comments, {});
        all[vid] = all[vid] || [];
        all[vid].unshift({ name: nm || "匿名", text: text, time: Date.now() });
        writeLocal(K.comments, all);
      }
    },
    getComments: async function (vid) {
      const r = await tryApi("/api/comments?vid=" + encodeURIComponent(vid));
      return r !== undefined ? r : (readLocal(K.comments, {})[vid] || []);
    },
    getAllCommentCounts: async function () {
      const r = await tryApi("/api/comments?all=1");
      if (r !== undefined) return r;
      const all = readLocal(K.comments, {});
      const c = {}; for (const k in all) c[k] = all[k].length;
      return c;
    },

    // ---- 留言板（姓名可选，留空则匿名）----
    addGuestbook: async function (text, name) {
      const nm = (name || "").trim();
      const r = await tryApi("/api/guestbook", { method: "POST", body: JSON.stringify({ name: nm, text: text }) });
      if (r === undefined) {
        const g = readLocal(K.guestbook, []);
        g.unshift({ name: nm || "匿名", text: text, time: Date.now() });
        writeLocal(K.guestbook, g);
      }
    },
    getGuestbook: async function () {
      const r = await tryApi("/api/guestbook");
      return r !== undefined ? r : readLocal(K.guestbook, []);
    },

    // ---- 看板统计（需管理密码）----
    // 后端可用：服务端校验密码，错则返回 {error:"unauthorized"}
    // 后端不可用：本地回退计算（本地本就无强保护）
    getStats: async function (pw) {
      try {
        const res = await fetch("/api/stats?pw=" + encodeURIComponent(pw));
        if (res.ok) return await res.json();
        if (res.status === 401) return { error: "unauthorized" };
        throw new Error("bad");
      } catch (e) {
        const visits = readLocal(K.visits, []);
        const gb = readLocal(K.guestbook, []);
        const all = readLocal(K.comments, {});
        let cc = 0; for (const k in all) cc += all[k].length;
        return computeVisitStats(visits, gb, cc);
      }
    },

    ping: async function () {
      try {
        const res = await fetch("/api/health");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        if (data && data.ok) {
          return { ok: true, msg: "✅ 已连接服务器，以下为全班汇总数据" };
        }
        return { ok: false, msg: "⚠️ 后端未连接：" + (data && data.error ? data.error : "请检查 Cloudflare KV 绑定") };
      } catch (e) {
        return { ok: false, msg: "⚠️ 未连接服务器（本地预览）：仅显示本设备数据。推送至 Cloudflare 并绑定 KV 后，即可全班跨设备汇总。" };
      }
    },

    esc: esc,
    fmt: fmt
  };
})();
