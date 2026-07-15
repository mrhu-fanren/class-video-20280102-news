// ============================================================
// 初2028届2班 · 新闻电台 — 访问门
// 第1步：输入访问密码（仅本班同学/家长/老师）
// 第2步：登录名字（同设备下次自动跳过，并记录到访）
// 修改 PASSWORD 更换访问密码；名字存于本设备，不清缓存就不会再问。
// ============================================================
(function () {
  const PASSWORD = "20280102";
  const PW_KEY = "class2news_unlocked";   // 本次会话已通过密码
  const NAME_KEY = "class2news_name";

  // 已经在本会话解锁且已有名字 → 直接放行
  if (sessionStorage.getItem(PW_KEY) === "1" && localStorage.getItem(NAME_KEY)) return;

  function unlock() {
    sessionStorage.setItem(PW_KEY, "1");
    document.body.style.overflow = "";
    const g = document.getElementById("gate");
    if (g) g.remove();
  }

  function showNameStep() {
    const gate = document.getElementById("gate");
    if (!gate) return;
    gate.innerHTML =
      '<div class="box">' +
        '<div class="lock">🙋</div>' +
        '<h2>登录你的名字</h2>' +
        '<p>请输入你的真实姓名（同设备下次自动登录）</p>' +
        '<input id="nm" type="text" placeholder="例如：陈荟颖" autocomplete="off" maxlength="20" />' +
        '<button id="saveName">进入电台</button>' +
        '<div class="err" id="err"></div>' +
      '</div>';
    const input = gate.querySelector("#nm");
    const btn = gate.querySelector("#saveName");
    const err = gate.querySelector("#err");
    input.focus();
    function save() {
      const name = input.value.trim();
      if (!name) { err.textContent = "请填写名字后再进入。"; return; }
      localStorage.setItem(NAME_KEY, name);
      Store.recordVisit(name);
      unlock();
    }
    btn.addEventListener("click", save);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") save(); });
  }

  function showGate() {
    const gate = document.createElement("div");
    gate.id = "gate";
    gate.innerHTML =
      '<div class="box">' +
        '<div class="lock">🔒</div>' +
        '<h2>班级新闻电台</h2>' +
        '<p>请输入访问密码（仅限本班同学、家长与老师）</p>' +
        '<input id="pw" type="password" placeholder="访问密码" autocomplete="off" />' +
        '<button id="enter">进入</button>' +
        '<div class="err" id="err"></div>' +
      '</div>';
    document.body.appendChild(gate);
    document.body.style.overflow = "hidden";

    const input = gate.querySelector("#pw");
    const btn = gate.querySelector("#enter");
    const err = gate.querySelector("#err");
    input.focus();

    function tryEnter() {
      if (input.value.trim() === PASSWORD) {
        sessionStorage.setItem(PW_KEY, "1");
        if (localStorage.getItem(NAME_KEY)) {
          Store.recordVisit(localStorage.getItem(NAME_KEY));
          unlock();
        } else {
          showNameStep();
        }
      } else {
        err.textContent = "密码不正确，请向班主任或管理员索取。";
        input.value = ""; input.focus();
      }
    }
    btn.addEventListener("click", tryEnter);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") tryEnter(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showGate);
  } else {
    showGate();
  }
})();
