import React, { useEffect, useRef } from 'react';

/**
 * AnimatedBackground
 * ============================================================
 * Full-screen canvas with a subtle Champagne-accent glow and drifting nodes.
 * Interactive to mouse, performance optimized, pauses on tab blur,
 * disabled on prefers-reduced-motion, reduced on mobile.
 */
export default function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    // Check reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (prefersReducedMotion || isTouch) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });

    let animId = null;
    let isTabVisible = !document.hidden;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const isMobile = window.innerWidth < 768;
    const nodeCount = isMobile ? 8 : 30;
    const maxDistance = isMobile ? 90 : 120;

    const accentHex = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
    const accent = accentHex.match(/[\da-f]{2}/gi)?.map((part) => parseInt(part, 16)) || [0, 0, 0];
    const accentRgb = accent.join(', ');
    const colors = Array.from({ length: 3 }, () => ({ r: accent[0], g: accent[1], b: accent[2] }));

    // Initialize nodes
    const nodes = [];
    for (let i = 0; i < nodeCount; i++) {
      const colorObj = colors[i % colors.length];
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: Math.random() * 1.1 + 0.8,
        color: colorObj,
        baseColor: `rgb(${colorObj.r}, ${colorObj.g}, ${colorObj.b})`,
      });
    }

    // Mouse tracking for gentle cursor interaction
    const mouse = { x: -2000, y: -2000, active: false };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -2000;
      mouse.y = -2000;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && !animId) {
        animId = requestAnimationFrame(render);
      }
    };

    let activeCard = null;
    let activeButton = null;
    const handlePointerMove = (event) => {
      const card = event.target.closest?.('.glass-card, .ui-card');
      if (activeCard && activeCard !== card) {
        activeCard.style.setProperty('--card-tilt-x', '0deg');
        activeCard.style.setProperty('--card-tilt-y', '0deg');
        activeCard.style.setProperty('--card-glare-x', '50%');
        activeCard.style.setProperty('--card-glare-y', '50%');
      }
      activeCard = card;
      if (card) {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        card.style.setProperty('--card-tilt-x', `${(x - 0.5) * 4}deg`);
        card.style.setProperty('--card-tilt-y', `${(0.5 - y) * 4}deg`);
        card.style.setProperty('--card-glare-x', `${x * 100}%`);
        card.style.setProperty('--card-glare-y', `${y * 100}%`);
      }

      const button = event.target.closest?.('.glow-btn-primary, .ui-button-primary');
      if (activeButton && activeButton !== button) {
        activeButton.style.setProperty('--magnet-x', '0px');
        activeButton.style.setProperty('--magnet-y', '0px');
      }
      activeButton = button;
      if (button) {
        const rect = button.getBoundingClientRect();
        button.style.setProperty('--magnet-x', `${((event.clientX - rect.left) / rect.width - 0.5) * 4}px`);
        button.style.setProperty('--magnet-y', `${((event.clientY - rect.top) / rect.height - 0.5) * 4}px`);
      }
    };
    const resetPointerEffects = () => {
      activeCard?.style.setProperty('--card-tilt-x', '0deg');
      activeCard?.style.setProperty('--card-tilt-y', '0deg');
      activeButton?.style.setProperty('--magnet-x', '0px');
      activeButton?.style.setProperty('--magnet-y', '0px');
      activeCard = null;
      activeButton = null;
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', resetPointerEffects);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Main animation loop
    const render = () => {
      if (!isTabVisible) {
        animId = null;
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Draw connection lines between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        const ni = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const nj = nodes[j];
          const dx = ni.x - nj.x;
          const dy = ni.y - nj.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.07;
            ctx.strokeStyle = `rgba(${accentRgb}, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(ni.x, ni.y);
            ctx.lineTo(nj.x, nj.y);
            ctx.stroke();
          }
        }

        // 2. Mouse interaction: gentle drift toward/away from cursor
        if (mouse.active) {
          const mdx = ni.x - mouse.x;
          const mdy = ni.y - mouse.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          const mouseRadius = 150;

          if (mdist < mouseRadius && mdist > 5) {
            const force = (1 - mdist / mouseRadius) * 0.08;
            ni.vx += (mdx / mdist) * force;
            ni.vy += (mdy / mdist) * force;

            // Faint connective line to cursor
            const mouseLineAlpha = (1 - mdist / mouseRadius) * 0.07;
            ctx.strokeStyle = `rgba(${accentRgb}, ${mouseLineAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ni.x, ni.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }

        // 3. Update position
        ni.x += ni.vx;
        ni.y += ni.vy;

        // Dampen velocity to prevent runaway speeds
        ni.vx *= 0.99;
        ni.vy *= 0.99;

        // Maintain minimum gentle drift
        const speed = Math.sqrt(ni.vx * ni.vx + ni.vy * ni.vy);
        if (speed < 0.15) {
          ni.vx += (Math.random() - 0.5) * 0.1;
          ni.vy += (Math.random() - 0.5) * 0.1;
        } else if (speed > 1.0) {
          ni.vx = (ni.vx / speed) * 1.0;
          ni.vy = (ni.vy / speed) * 1.0;
        }

        // Soft wrap / bounce at edges
        if (ni.x < -10) ni.x = width + 10;
        else if (ni.x > width + 10) ni.x = -10;
        if (ni.y < -10) ni.y = height + 10;
        else if (ni.y > height + 10) ni.y = -10;

        // 4. Draw glowing node
        ctx.fillStyle = ni.baseColor;
        ctx.shadowColor = ni.baseColor;
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.arc(ni.x, ni.y, ni.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', resetPointerEffects);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]"
    >
      {/* ── Obsidian background with a gentle Champagne glow ── */}
      <div className="absolute inset-0 bg-bg" />
      <div
        className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full opacity-10 blur-[140px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 16%, transparent) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute top-[40%] -right-[15%] w-[65vw] h-[65vw] rounded-full opacity-10 blur-[150px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 12%, transparent) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute -bottom-[20%] left-[25%] w-[60vw] h-[60vw] rounded-full opacity-10 blur-[160px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 10%, transparent) 0%, transparent 70%)',
        }}
      />

      {/* ── Network Canvas of Drifting Connected Nodes ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full opacity-40"
      />
    </div>
  );
}
