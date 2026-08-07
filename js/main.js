'use strict';
/* ============================================================
 * 启动：画布缩放（内部 480x270 像素化放大）+ 引擎初始化
 * 横屏/桌面：等比缩放居中；移动端竖屏：整体旋转 90° 铺满
 * ============================================================ */
(function () {
  const cv = document.getElementById('game');
  const wrap = document.getElementById('wrap');
  const W = 480, H = 270; // 逻辑分辨率
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const rot = window.TouchLayer && window.TouchLayer.isRotated();
    wrap.classList.toggle('rotate', !!rot);
    let s = rot ? Math.min(h / W, w / H) : Math.min(w / W, h / H);
    s = Math.max(0.5, s);
    const cw = Math.round(W * s), ch = Math.round(H * s);
    cv.style.width = cw + 'px';
    cv.style.height = ch + 'px';
    if (rot) {
      /* rotate(90°) 后视觉矩形：x∈[left-ch,left]（宽 ch），y∈[top,top+cw]（高 cw），绕左上角原点 */
      wrap.style.left = (w + ch) / 2 + 'px';   /* 视觉宽 = ch，居中 */
      wrap.style.top = (h - cw) / 2 + 'px';    /* 视觉高 = cw，居中 */
      wrap.style.width = cw + 'px';            /* 旋转前自身尺寸 */
      wrap.style.height = ch + 'px';
    } else {
      wrap.style.left = Math.floor((w - cw) / 2) + 'px';
      wrap.style.top = Math.floor((h - ch) / 2) + 'px';
      wrap.style.width = cw + 'px';
      wrap.style.height = ch + 'px';
    }
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
  resize();
  Engine.init();
  UI.show('title');
})();