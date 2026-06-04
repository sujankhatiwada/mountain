(function () {
  'use strict';

  const VIEW_W = 800;
  const VIEW_H = 500;
  const DPR_CAP = 2;

  const canvas = document.getElementById('birds');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = 0;
  let running = false;
  let segmentStart = 0;
  let pausedElapsed = 0;
  let userPaused = false;
  let lastToggleAt = 0;

  const birds = [
    {
      baseX: 480,
      baseY: 95,
      scale: 1,
      fill: 'rgba(90, 107, 125, 0.75)',
      bodyFill: 'rgba(122, 138, 154, 0.5)',
      driftX: 140,
      driftY: 14,
      speedX: 0.22,
      speedY: 0.65,
      flapSpeed: 10,
      phase: 0,
    },
    {
      baseX: 320,
      baseY: 130,
      scale: 0.55,
      fill: 'rgba(107, 125, 143, 0.35)',
      bodyFill: null,
      driftX: 90,
      driftY: 10,
      speedX: 0.14,
      speedY: 0.5,
      flapSpeed: 8,
      phase: 1.8,
    },
  ];

  function sliceTransform(w, h) {
    const scale = Math.max(w / VIEW_W, h / VIEW_H);
    const dw = VIEW_W * scale;
    const dh = VIEW_H * scale;
    return {
      scale,
      ox: (w - dw) * 0.5,
      oy: (h - dh) * 0.5,
    };
  }

  function drawWings(c, flap) {
    const lift = flap * 10;
    c.beginPath();
    c.moveTo(-28, 8);
    c.bezierCurveTo(-18, 0 - lift, -8, -6 - lift * 0.6, 0, -4);
    c.bezierCurveTo(8, -6 - lift * 0.6, 18, 0 - lift, 28, 8);
    c.bezierCurveTo(18, 4, 8, 2, 0, 3);
    c.bezierCurveTo(-8, 2, -18, 4, -28, 8);
    c.closePath();
  }

  function drawBody(c) {
    c.beginPath();
    c.moveTo(-12, 6);
    c.bezierCurveTo(-6, 2, 0, 0, 6, 2);
    c.bezierCurveTo(0, 4, -6, 6, -12, 6);
    c.closePath();
  }

  function drawBird(c, bird, time) {
    const t = time * 0.001;
    const flap = Math.sin(t * bird.flapSpeed + bird.phase);
    const x =
      bird.baseX +
      Math.sin(t * bird.speedX + bird.phase) * bird.driftX;
    const y =
      bird.baseY +
      Math.sin(t * bird.speedY + bird.phase * 1.3) * bird.driftY;
    const tilt = Math.sin(t * bird.speedX + bird.phase) * 0.08;

    c.save();
    c.translate(x, y);
    c.rotate(tilt);
    c.scale(bird.scale, bird.scale);

    drawWings(c, flap);
    c.fillStyle = bird.fill;
    c.fill();

    if (bird.bodyFill) {
      drawBody(c);
      c.fillStyle = bird.bodyFill;
      c.fill();
    }

    c.restore();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function frame(now) {
    if (!running) return;

    if (!segmentStart) segmentStart = now;
    const elapsed = pausedElapsed + (now - segmentStart);

    const { scale, ox, oy } = sliceTransform(width, height);

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    for (let i = 0; i < birds.length; i++) {
      drawBird(ctx, birds[i], elapsed);
    }

    ctx.restore();
    rafId = requestAnimationFrame(frame);
  }

  function pauseAnim() {
    if (!running) return;
    const now = performance.now();
    if (segmentStart) pausedElapsed += now - segmentStart;
    segmentStart = 0;
    running = false;
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function resumeAnim() {
    if (running || reducedMotion.matches) return;
    running = true;
    segmentStart = 0;
    rafId = requestAnimationFrame(frame);
  }

  function startFresh() {
    pausedElapsed = 0;
    segmentStart = 0;
    userPaused = false;
    if (running) {
      cancelAnimationFrame(rafId);
      rafId = 0;
      running = false;
    }
    resumeAnim();
  }

  function toggleUserPause() {
    if (reducedMotion.matches) return;
    const now = Date.now();
    if (now - lastToggleAt < 400) return;
    lastToggleAt = now;

    if (running) {
      userPaused = true;
      pauseAnim();
    } else {
      userPaused = false;
      resumeAnim();
    }
  }

  function onVisibility() {
    if (document.hidden) pauseAnim();
    else if (!userPaused && !reducedMotion.matches) resumeAnim();
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function onMotionPreference() {
    if (reducedMotion.matches) {
      pauseAnim();
      pausedElapsed = 0;
      resize();
      const { scale, ox, oy } = sliceTransform(width, height);
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);
      for (let i = 0; i < birds.length; i++) {
        drawBird(ctx, birds[i], 0);
      }
      ctx.restore();
    } else if (!userPaused) {
      startFresh();
    }
  }

  resize();
  onMotionPreference();

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  reducedMotion.addEventListener('change', onMotionPreference);

  document.addEventListener('dblclick', function (e) {
    e.preventDefault();
    toggleUserPause();
  });

  let lastTap = 0;
  document.addEventListener(
    'touchend',
    function (e) {
      if (e.touches.length > 0) return;
      const t = Date.now();
      if (t - lastTap < 350) {
        lastTap = 0;
        e.preventDefault();
        toggleUserPause();
      } else {
        lastTap = t;
      }
    },
    { passive: false }
  );
})();
