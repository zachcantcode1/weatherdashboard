import React, { useEffect, useRef } from 'react';

// A more sophisticated lightning-storm effect adapted from
// https://codepen.io/Nvagelis/pen/yaQGAL (MIT licence)
// – Canvas based, renders rain + branching lightning with screen flashes.
// – No third-party libs; lightweight but visually realistic.

const rand = (min, max) => Math.random() * (max - min) + min;

export default function LightningStormPro() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const droplets = useRef([]);
  const MAX_DROPLETS = 50; // Reduced from 200
  const MAX_LIGHTNINGS = 3; // Reduced from 6
  const lightnings = useRef([]);
  // const flashAlpha = useRef(0);  // disabled global flashes

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // --- Rain helpers
    const createDrop = () => ({
      x: rand(0, canvas.width),
      y: rand(-canvas.height, 0),
      len: rand(10, 20),
      speed: rand(4, 10),
    });
    for (let i = 0; i < MAX_DROPLETS; i++) droplets.current.push(createDrop());

    // --- Lightning helpers
    const createLightning = () => {
      const bolt = [];
      const x = rand(0, canvas.width);
      const y = 0;
      bolt.push({ x, y });
      let currentY = y;
      let currentX = x;
      const branchChance = 0.3;
      while (currentY < canvas.height * rand(0.6, 0.9)) {
        const nextX = currentX + rand(-40, 40);
        const nextY = currentY + rand(10, 40);
        bolt.push({ x: nextX, y: nextY });
        currentX = nextX;
        currentY = nextY;
        // occasional branch
        if (Math.random() < branchChance) {
          if (lightnings.current.length < MAX_LIGHTNINGS) {
            lightnings.current.push({ pts: bolt.slice(), alpha: 1 });
          }
        }
      }
      return { pts: bolt, alpha: 1 };
    };
    let lastLightning = 0;

    // --- Main loop
    let isVisible = true;
    document.addEventListener('visibilitychange', () => {
      isVisible = !document.hidden;
    });

    const loop = (time) => {
      if (!isVisible) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Rain
      ctx.strokeStyle = 'rgba(174,194,224,0.5)';
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      droplets.current.forEach((d) => {
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x, d.y + d.len);
        ctx.stroke();
        d.y += d.speed;
        if (d.y > canvas.height) {
          d.y = rand(-20, 0);
          d.x = rand(0, canvas.width);
        }
      });

      // Lightning generator
      /*
      if (time - lastLightning > rand(2500, 6000)) {
        if (lightnings.current.length < MAX_LIGHTNINGS) {
          lightnings.current.push(createLightning());
        }
        // Removed global white flash
        lastLightning = time;
      }
      */

      // Lightning draw
      /*
      ctx.lineWidth = 2;
      for (let i = lightnings.current.length - 1; i >= 0; i--) {
        const l = lightnings.current[i];
        ctx.strokeStyle = `rgba(255,255,255,${l.alpha})`;
        ctx.shadowColor = `rgba(255,255,255,${l.alpha})`;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(l.pts[0].x, l.pts[0].y);
        for (let p = 1; p < l.pts.length; p++) {
          ctx.lineTo(l.pts[p].x, l.pts[p].y);
        }
        ctx.stroke();
        l.alpha -= 0.02;
        if (l.alpha <= 0) lightnings.current.splice(i, 1);
      }
      */

      // Screen flash
      // if (flashAlpha.current > 0) {
      //   ctx.fillStyle = `rgba(255,255,255,${flashAlpha.current})`;
      //   ctx.fillRect(0, 0, canvas.width, canvas.height);
      //   flashAlpha.current -= 0.02;
      // }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-20 mix-blend-screen" />;
}
