import React, { useRef, useEffect } from 'react';

// Simple canvas-based lightning storm. Generates random bolts every few seconds.
// Each bolt is a polyline generated via a basic midpoint displacement algorithm.
// The bolt is drawn with a white/yellow stroke and a glow (shadowBlur). It fades
// out automatically. No external libs required, keeps bundle size small.

const random = (min, max) => Math.random() * (max - min) + min;

function generateBolt(startX, startY, endX, endY, segments = 10, sway = 30) {
  const bolt = [{ x: startX, y: startY }, { x: endX, y: endY }];
  // Midpoint displacement
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const x = startX + (endX - startX) * t + random(-sway, sway);
    const y = startY + (endY - startY) * t + random(-sway, sway);
    bolt.push({ x, y });
  }
  bolt.sort((a, b) => a.y - b.y); // sort by y to keep order
  return bolt;
}

const LightningStorm = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const boltsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const addBolt = () => {
      const startX = random(0, canvas.width);
      const startY = 0;
      const endX = startX + random(-50, 50);
      const endY = canvas.height * random(0.6, 0.9);
      const bolt = generateBolt(startX, startY, endX, endY);
      boltsRef.current.push({ bolt, alpha: 1 });
    };

    let lastBoltTime = 0;
    const loop = (time) => {
      const delta = time - lastBoltTime;
      if (delta > random(2000, 5000)) { // 2-5 seconds between bolts
        addBolt();
        lastBoltTime = time;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      boltsRef.current.forEach((b) => {
        ctx.save();
        ctx.globalAlpha = b.alpha;
        ctx.strokeStyle = '#ffffdd';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ffffaa';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(b.bolt[0].x, b.bolt[0].y);
        for (let i = 1; i < b.bolt.length; i++) {
          ctx.lineTo(b.bolt[i].x, b.bolt[i].y);
        }
        ctx.stroke();
        ctx.restore();
        b.alpha -= 0.03; // fade speed
      });
      // Remove faded bolts
      boltsRef.current = boltsRef.current.filter((b) => b.alpha > 0);
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-20 mix-blend-screen"
    />
  );
};

export default LightningStorm;
