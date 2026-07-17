// ============================================================
// 初2028届2班 · 新闻电台 — 页面底部留言板组件
// 用法：在页面底部放 <div id="guestbook"></div> 并引入本脚本
// ============================================================
(function () {
  const el = document.getElementById("guestbook");
  if (!el) return;

  async function render() {
    const list = await Store.getGuestbook();
    el.innerHTML =
      '<div class="gb-head"><h3>💬 班级留言板</h3>' +
      '<p class="hint">写下你想对班级说的话，大家一起看～</p></div>' +
      '<form id="gb-form" class="gb-form">' +
        '<input id="gb-name" type="text" maxlength="20" placeholder="你的昵称（选填，留空则显示为「匿名」）" autocomplete="off" />' +
        '<textarea id="gb-text" rows="3" placeholder="说点什么…" required></textarea>' +
        '<button type="submit">发送留言</button>' +
      '</form>' +
      '<div class="gb-list">' +
        (list.length
          ? list.map(function (c) {
              return '<div class="gb-item">' +
                '<div class="gb-meta"><b>' + Store.esc(c.name || "匿名") + '</b>' +
                '<span>' + Store.fmt(c.time) + '</span></div>' +
                '<div class="gb-text">' + Store.esc(c.text) + '</div>' +
              '</div>';
            }).join("")
          : '<p class="gb-empty">还没有留言，快来抢沙发～</p>') +
      '</div>';

    const nameEl = el.querySelector("#gb-name");

    el.querySelector("#gb-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      const ta = el.querySelector("#gb-text");
      const t = ta.value.trim();
      if (!t) return;
      const nm = nameEl ? nameEl.value.trim() : "";
      await Store.addGuestbook(t, nm);
      render();
    });
  }

  render();
})();
