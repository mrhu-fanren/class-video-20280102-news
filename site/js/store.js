// ============================================================
// 初2028届2班 · 新闻电台 — 数据层
// 优先调用 Cloudflare Pages Functions (/api/*) 实现跨设备汇总；
// 若后端不可用（纯静态/本地预览），自动回退到浏览器本地存储。
// 切换后端无需改动任何页面代码。
// ============================================================
window.Store = (function () {
  const K = {
    name: "class2news_name",
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
  // 由到访记录(含 {ip,time}) 计算四项访问指标
  function computeVisitStats(visits, guestbook, commentCount) {
    const today = dayKey(Date.now());
    const ipSet = {}, dayIpSet = {};
    let dailyVisits = 0;
    visits.forEach(function (v) {
      const ip = v.ip || "未知";
      ipSet[ip] = 1;
      if (dayKey(v.time) === today) { dailyVisits++; dayIpSet[ip] = 1; }
    });
    return {
      visits: visits,
      guestbook: guestbook,
      commentCount: commentCount,
      totalVisits: visits.length,        // 总访问次数
      dailyVisits: dailyVisits,          // 每日访问总次数
      dailyPeople: Object.keys(dayIpSet).length, // 每日访问总人数
      totalPeople: Object.keys(ipSet).length,     // 访问总人数
      guestbookCount: (guestbook || []).length
    };
  }

  return {
    // ---- 当前用户名字（始终存本设备）----
    getName: function () { return localStorage.getItem(K.name) || ""; },
    setName: function (n) { localStorage.setItem(K.name, n); },
    hasName: function () { return !!localStorage.getItem(K.name); },

    // ---- 到访记录（只记 IP + 时间，不记姓名）----
    recordVisit: async function () {
      const r = await tryApi("/api/visits", { method: "POST", body: JSON.stringify({}) });
      if (r === undefined) {
        const v = readLocal(K.visits, []);
        v.push({ ip: "本地预览", time: Date.now() });
        writeLocal(K.visits, v);
      }
    },
    getVisits: async function () {
      const r = await tryApi("/api/visits");
      return r !== undefined ? r : readLocal(K.visits, []);
    },

    // ---- 视频评论 ----
    addComment: async function (vid, text) {
      const r = await tryApi("/api/comments", { method: "POST", body: JSON.stringify({ vid: vid, name: Store.getName(), text: text }) });
      if (r === undefined) {
        const all = readLocal(K.comments, {});
        all[vid] = all[vid] || [];
        all[vid].unshift({ name: Store.getName(), text: text, time: Date.now() });
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

    // ---- 留言板 ----
    addGuestbook: async function (text) {
      const r = await tryApi("/api/guestbook", { method: "POST", body: JSON.stringify({ name: Store.getName(), text: text }) });
      if (r === undefined) {
        const g = readLocal(K.guestbook, []);
        g.unshift({ name: Store.getName(), text: text, time: Date.now() });
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
