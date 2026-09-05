// ============================================================
// 初2028届2班 · 新闻电台 — 页面底部留言板组件
// v70-3：表单改为静态 HTML（永不失效），本脚本只负责：
//   1) 渲染留言列表
//   2) 绑定提交事件
// ============================================================
(function () {
  const el = document.getElementById("guestbook");
  if (!el) return;

  const listEl = el.querySelector("#gb-list") || document.createElement("div");

  async function renderList() {
    try {
      const list = await Store.getGuestbook();
      if (!listEl.parentNode) el.appendChild(listEl);
      listEl.innerHTML = list.length
        ? list.map(function (c) {
            return '<div class="gb-item">' +
              '<div class="gb-meta"><b>' + Store.esc(c.name || "匿名") + '</b>' +
              '<span>' + Store.fmt(c.time) + '</span></div>' +
              '<div class="gb-text">' + Store.esc(c.text) + '</div>' +
            '</div>';
          }).join("")
        : '<p class="gb-empty">还没有留言，快来抢沙发～</p>';
    } catch (e) {
      // 列表加载失败：至少显示空状态，不阻断表单
      listEl.innerHTML = '<p class="gb-empty">留言加载失败，但你可以先留言～</p>';
    }
  }

  const form = el.querySelector("#gb-form");
  if (form) {
    const nameEl = el.querySelector("#gb-name");
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const ta = el.querySelector("#gb-text");
      if (!ta) return;
      const t = ta.value.trim();
      if (!t) return;
      const nm = nameEl ? nameEl.value.trim() : "";
      try {
        await Store.addGuestbook(t, nm);
        ta.value = "";
        renderList();
      } catch (err) {
        // 后端不可用时 addGuestbook 内部会回退本地，一般不走到这里
      }
    });
  }

  renderList();
})();
