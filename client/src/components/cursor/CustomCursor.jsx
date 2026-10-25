import React, { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const canvasRef = useRef(null);
  const spotlightRef = useRef(null);
  const [isPointer, setIsPointer] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [disabled, setDisabled] = useState(false);

  // Position state with lerp
  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const particles = useRef([]);
  const animFrameId = useRef(null);

  useEffect(() => {
    // Check for touch device or reduced motion
    const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isTouch || prefersReducedMotion) {
      setDisabled(true);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const accentHex = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
    const accentParts = accentHex.match(/[\da-f]{2}/gi)?.map((part) => parseInt(part, 16)) || [0, 0, 0];
    const accentRgb = accentParts.join(', ');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMouseMove = (e) => {
      if (!isVisible) setIsVisible(true);
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (spotlightRef.current) {
        spotlightRef.current.style.background = `radial-gradient(520px circle at ${e.clientX}px ${e.clientY}px, color-mix(in srgb, var(--color-accent) 8%, transparent), transparent 72%)`;
      }

      // Update dot immediately
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      // Check if hovering over clickable element
      const target = e.target;
      const isClickable =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('.glass-card, .ui-card') ||
        target.classList.contains('cursor-pointer') ||
        target.getAttribute('role') === 'button';

      setIsPointer(!!isClickable);

      // Keep cursor particles on the shared accent token.
      if (particles.current.length < 14 && Math.random() > 0.78) {
        const colorPrefix = `rgba(${accentRgb}, `;

        particles.current.push({
          x: e.clientX + (Math.random() * 4 - 2),
          y: e.clientY + (Math.random() * 4 - 2),
          size: Math.random() * 0.8 + 0.6,
          color: colorPrefix,
          opacity: 0.22,
          vx: (Math.random() - 0.5) * 0.7,
          vy: (Math.random() - 0.5) * 0.7,
          life: 1,
        });
      }
    };

    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    // Render loop with lerp for trailing ring and particle canvas
    const render = () => {
      // Lerp ring
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.18;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.18;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
      }

      // Canvas particles
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.opacity -= 0.055;
        p.size *= 0.94;

        if (p.opacity <= 0 || p.size < 0.2) {
          particles.current.splice(i, 1);
          continue;
        }

        ctx.fillStyle = `${p.color}${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, []);

  if (disabled) return null;

  return (
    <>
      {/* Background soft accent spotlight */}
      <div
        ref={spotlightRef}
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
        style={{
          background: 'radial-gradient(520px circle at 50% 50%, color-mix(in srgb, var(--color-accent) 8%, transparent), transparent 72%)',
        }}
      />

      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-40 transition-opacity duration-300"
        style={{ opacity: isVisible ? 1 : 0 }}
      />

      {/* Center Dot */}
      <div
        ref={dotRef}
        className="pointer-events-none fixed top-0 left-0 z-50 -ml-1 -mt-1 h-2 w-2 rounded-full transition-opacity duration-200"
        style={{
          opacity: isVisible ? 1 : 0,
          background: 'var(--color-accent)',
          boxShadow: isPointer
            ? '0 0 6px color-mix(in srgb, var(--color-accent) 45%, transparent)'
            : '0 0 4px color-mix(in srgb, var(--color-accent) 35%, transparent)',
        }}
      />

      {/* Trailing Ring (Smooth Lerp) */}
      <div
        ref={ringRef}
        className="pointer-events-none fixed top-0 left-0 z-50 -ml-4 -mt-4 rounded-full border transition-all duration-150 ease-out"
        style={{
          width: isPointer ? '38px' : '30px',
          height: isPointer ? '38px' : '30px',
          marginLeft: isPointer ? '-19px' : '-15px',
          marginTop: isPointer ? '-19px' : '-15px',
          borderColor: `color-mix(in srgb, var(--color-accent) ${isPointer ? '55%' : '35%'}, transparent)`,
          backgroundColor: isPointer ? 'color-mix(in srgb, var(--color-accent) 4%, transparent)' : 'transparent',
          opacity: isVisible ? 1 : 0,
        }}
      />
    </>
  );
}
