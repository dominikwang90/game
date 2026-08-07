'use strict';
/* ============================================================
 * 移动端触控层：虚拟摇杆 / 专属技能按钮 / 暂停 / 竖屏旋转
 * 桌面端不加载任何触控 UI，键盘操作保持不变
 * ============================================================ */
(function () {
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const wrap = document.getElementById('wrap');
  const layer = document.getElementById('touch-layer');
  const joy = document.getElementById('joystick');
  const knob = document.getElementById('joystick-knob');
  const R = 42; // 摇杆活动半径(px)

  /* 引擎每帧读取的摇杆输入（-1..1） */
  window.TOUCH = { mx: 0, my: 0 };

  if (!isTouch || !wrap || !layer) {
    window.TouchLayer = { isTouch: false, setVisible: function () {}, isRotated: function () { return false; } };
    return;
  }
  document.body.classList.add('touch-device');

  /* ---------- 虚拟摇杆 ---------- */
  let joyId = null;
  function joyCenter() {
    const r = joy.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function joyUpdate(cx, cy) {
    let dx = cx - joyCenter().x, dy = cy - joyCenter().y;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    window.TOUCH.mx = dx / R;
    window.TOUCH.my = dy / R;
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  }
  function joyEnd() {
    joyId = null;
    window.TOUCH.mx = 0; window.TOUCH.my = 0;
    knob.style.transform = 'translate(0,0)';
  }
  joy.addEventListener('touchstart', function (e) {
    e.preventDefault();
    const t = e.changedTouches[0];
    if (joyId === null) { joyId = t.identifier; joyUpdate(t.clientX, t.clientY); }
  }, { passive: false });
  joy.addEventListener('touchmove', function (e) {
    e.preventDefault();
    for (const t of e.changedTouches) if (t.identifier === joyId) joyUpdate(t.clientX, t.clientY);
  }, { passive: false });
  joy.addEventListener('touchend', function (e) {
    for (const t of e.changedTouches) if (t.identifier === joyId) joyEnd();
    e.preventDefault();
  }, { passive: false });
  joy.addEventListener('touchcancel', function (e) {
    for (const t of e.changedTouches) if (t.identifier === joyId) joyEnd();
  });

  /* ---------- 专属技能 / 暂停 ---------- */
  function bindBtn(id, fn) {
    const b = document.getElementById(id);
    if (!b) return;
    b.addEventListener('touchstart', function (e) { e.preventDefault(); fn(); }, { passive: false });
  }
  bindBtn('ult1', function () { if (window.Engine && Engine.useUlt) Engine.useUlt(0); });
  bindBtn('ult2', function () { if (window.Engine && Engine.useUlt) Engine.useUlt(1); });
  bindBtn('pause-btn', function () { if (window.Engine && Engine.togglePause) Engine.togglePause(); });

  /* ---------- 可见性：战斗时显示，界面面板时隐藏 ---------- */
  window.TouchLayer = {
    isTouch: true,
    setVisible: function (v) {
      layer.classList.toggle('hidden', !v);
      if (!v) joyEnd();
    },
    isRotated: function () { return window.innerHeight > window.innerWidth; }
  };
})();