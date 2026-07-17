// ============================================================
// 初2028届2班 · 新闻电台 — 访问门
// 第0步：阅读并同意《使用规则》（必须勾选才能继续）
// 第1步：输入访问密码（仅本班同学/家长/老师）
// 访问记录只采集访客 IP 与到访时间，不记录姓名。
// 修改 PASSWORD 更换访问密码。
// ============================================================
(function () {
  const PASSWORD = "20280102";
  const PW_KEY = "class2news_unlocked";   // 本次会话已通过密码
  const AGREE_KEY = "class2news_agreed";  // 本次会话已同意规则

  // 本次会话已经解锁 → 直接放行（不再依赖名字）
  if (sessionStorage.getItem(PW_KEY) === "1") return;

  // 《使用规则》全文（醒目置顶，必须勾选同意）
  const RULES_HTML =
    '<div class="rules-note">请详细阅读下列条款</div>' +
    '<div class="rules-title">关于本合集 · 使用规则</div>' +
    '<div class="rules">' +
      '<div class="rule"><b>一、素材来源</b><p>本合集所有视频均取自 2 班 QQ 群内同学自行上传的新闻播报作业，整理者为本班同学，已向班主任报备知情。每段视频的出镜者即上传者本人，本页仅作合集整理与集中播放，未对原视频作剪切、配音、加字幕之外的实质性改动，亦未用作其他用途。</p></div>' +
      '<div class="rule"><b>二、使用范围与用途</b><p>本页设密码访问，网址仅发布于 2 班 QQ 群，范围限定于 2 班师生内部回顾、课后交流。非商用、不对外传播、不向不特定公众开放。如被搜索引擎收录或遭外传，非整理者本意，整理者发现后即时处理。</p></div>' +
      '<div class="rule"><b>三、访问者义务</b><p>输入密码即视为访客确认其为 2 班师生，并承诺：不转发网址、不录屏外传、不用于班级以外任何场景、不对视频作二次剪辑后发布至任何平台。访客违反本条导致的外溢传播、肖像或隐私争议等，由该访客自行承担。</p></div>' +
      '<div class="rule"><b>四、撤回通道</b><p>如有同学不希望自己的播报在此展示，可发邮件至 cfplhyszgyfjch13@sohu.com 说明，整理者收到后即作删除处理，无需说明理由。任何权利人就本页任何视频提出书面说明的，收到即删，争议以权利人说明为准。</p></div>' +
      '<div class="rule"><b>五、其他</b><p>本页为访问提示与善意说明，整理者已尽合理注意义务（来源标明、范围限定、非商用、预留撤回通道）。本页不构成对任何第三方权利的明示或默示许可，法定权利不因本页声明而被排除或削减。</p></div>' +
    '</div>';

  function unlock() {
    sessionStorage.setItem(PW_KEY, "1");
    document.body.style.overflow = "";
    const g = document.getElementById("gate");
    if (g) g.remove();
  }

  function showPwStep() {
    const gate = document.getElementById("gate");
    if (!gate) return;
    gate.innerHTML =
      '<div class="box box-rules">' +
        RULES_HTML +
        '<h2>班级新闻电台</h2>' +
        '<p>请输入访问密码（仅限本班同学、家长与老师）</p>' +
        '<input id="pw" type="password" placeholder="访问密码" autocomplete="off" />' +
        '<button id="enter">进入</button>' +
        '<div class="err" id="err"></div>' +
      '</div>';
    const input = gate.querySelector("#pw");
    const btn = gate.querySelector("#enter");
    const err = gate.querySelector("#err");
    input.focus();

    function tryEnter() {
      if (input.value.trim() === PASSWORD) {
        // 密码正确 → 记录一次访问（IP + 时间，不记姓名），然后放行
        if (window.Store && Store.recordVisit) Store.recordVisit();
        unlock();
      } else {
        err.textContent = "密码不正确，请向班主任或管理员索取。";
        input.value = ""; input.focus();
      }
    }
    btn.addEventListener("click", tryEnter);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") tryEnter(); });
  }

  function showGate() {
    const gate = document.createElement("div");
    gate.id = "gate";
    gate.innerHTML =
      '<div class="box box-rules">' +
        RULES_HTML +
        '<label class="agree"><input type="checkbox" id="agree" /> 我已阅读并同意遵守使用规则</label>' +
        '<button id="toPw" disabled>同意并继续</button>' +
        '<div class="err" id="err"></div>' +
      '</div>';
    document.body.appendChild(gate);
    document.body.style.overflow = "hidden";

    const cb = gate.querySelector("#agree");
    const btn = gate.querySelector("#toPw");

    // 本会话已同意过 → 直接进入密码步骤（规则仍置顶展示）
    if (sessionStorage.getItem(AGREE_KEY) === "1") {
      showPwStep();
      return;
    }

    cb.addEventListener("change", function () {
      btn.disabled = !cb.checked;
    });
    btn.addEventListener("click", function () {
      if (!cb.checked) return;
      sessionStorage.setItem(AGREE_KEY, "1");
      showPwStep();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showGate);
  } else {
    showGate();
  }
})();
