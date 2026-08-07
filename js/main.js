'use strict';
/* ============================================================
 * 启动：画布缩放（内部 480x270 像素化放大）+ 引擎初始化
 * ============================================================ */
(function () {
  const cv = document.getElementById('game');
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const scale = Math.max(1, Math.min(w / 480, h / 270));
    const cw = Math.floor(480 * scale), ch = Math.floor(270 * scale);
    cv.style.width = cw + 'px';
    cv.style.height = ch + 'px';
    cv.style.left = Math.floor((w - cw) / 2) + 'px';
    cv.style.top = Math.floor((h - ch) / 2) + 'px';
  }
  window.addEventListener('resize', resize);
  resize();
  Engine.init();
  UI.show('title');
})();
