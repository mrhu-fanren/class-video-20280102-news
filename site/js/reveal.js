// reveal.js — 编排式载入动效（v66）
// 用法：给需要错峰显现的元素加 .reveal，容器加 data-reveal="1"
// 容器内子元素按顺序自动分配交错延迟（CSS 变量 --i 控制）。
(function () {
  function init(scope) {
    var root = scope || document;
    var targets = root.querySelectorAll(".reveal:not(.in)");
    if (!targets.length) return;

    // 无 IntersectionObserver：直接全部显示（内容永不可见是底线错误）
    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (t) { t.classList.add("in"); });
      return;
    }

    // 收集所有 [data-reveal] 容器，为每个子元素分配顺序号
    var containers = root.querySelectorAll("[data-reveal]");
    containers.forEach(function (c) {
      var items = c.querySelectorAll(".reveal");
      for (var i = 0; i < items.length; i++) {
        items[i].style.setProperty("--i", i);
      }
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });

    targets.forEach(function (t) { io.observe(t); });

    // 已在视口内的直接显示
    targets.forEach(function (t) {
      if (t.getBoundingClientRect().top < window.innerHeight) {
        t.classList.add("in");
        io.unobserve(t);
      }
    });

    // 兜底：1.5s 后仍未显现的强制显示（防 IO 异常导致内容不可见）
    setTimeout(function () {
      root.querySelectorAll(".reveal:not(.in)").forEach(function (t) {
        t.classList.add("in");
      });
    }, 1500);
  }

  // 首次加载
  init(document);
  // 动态渲染（如搜索过滤后重绘列表）后可调用此函数重新初始化
  // opts.instant = true 时同步显示（搜索场景，避免重复动画闪动）
  window.__revealInit = function (el, opts) {
    if (!el) return;
    opts = opts || {};
    var items = el.querySelectorAll(".reveal");
    for (var i = 0; i < items.length; i++) {
      items[i].style.setProperty("--i", i);
    }
    if (opts.instant || !("IntersectionObserver" in window)) {
      items.forEach(function (t) { t.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (t) {
      if (!t.classList.contains("in")) {
        var r = t.getBoundingClientRect();
        if (r.top < window.innerHeight) { t.classList.add("in"); }
        else { io.observe(t); }
      }
    });

    // 兜底：1.5s 后仍未显现的强制显示（防 IO 异常导致内容不可见）
    setTimeout(function () {
      el.querySelectorAll(".reveal:not(.in)").forEach(function (t) {
        t.classList.add("in");
      });
    }, 1500);
  };
})();
