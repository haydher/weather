import { useEffect, useRef } from "react";

export function Starfield() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let frame;
    let t = 0;
    let shootingStars = [];

    const stars = Array.from({ length: 320 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.6 + 0.2,
      alpha: Math.random() * 0.7 + 0.25,
      twinkleSpeed: Math.random() * 0.006 + 0.002,
      twinkleOffset: Math.random() * Math.PI * 2,
      color: pickStarColor(),
    }));

    function pickStarColor() {
      const palette = [
        "220,230,255", // blue-white
        "255,245,220", // warm white
        "200,220,255", // cool blue
        "255,255,255", // pure white
        "255,220,200", // faint orange
      ];
      return palette[Math.floor(Math.random() * palette.length)];
    }

    function spawnShootingStar() {
      const startX = Math.random() * 0.7 + 0.1;
      const startY = Math.random() * 0.4;
      const angle = (Math.random() * 20 + 20) * (Math.PI / 180);
      const speed = Math.random() * 0.004 + 0.005;
      const length = Math.random() * 0.12 + 0.08;
      shootingStars.push({
        x: startX,
        y: startY,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        length,
        progress: 0,
        alpha: 0,
        duration: Math.random() * 60 + 50,
        age: 0,
      });
    }

    function scheduleShootingStar() {
      const delay = Math.random() * 5000 + 3000;
      setTimeout(() => {
        spawnShootingStar();
        scheduleShootingStar();
      }, delay);
    }

    scheduleShootingStar();

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    function drawShootingStar(s) {
      const x = s.x * canvas.width;
      const y = s.y * canvas.height;
      const tailX = x - Math.cos((25 * Math.PI) / 180) * s.length * canvas.width * (s.progress / s.duration);
      const tailY = y - Math.sin((25 * Math.PI) / 180) * s.length * canvas.height * (s.progress / s.duration);

      const grad = ctx.createLinearGradient(tailX, tailY, x, y);
      grad.addColorStop(0, `rgba(255,255,255,0)`);
      grad.addColorStop(1, `rgba(255,255,255,${s.alpha})`);

      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // head glow
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
      ctx.fill();
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 1;

      // stars
      for (const s of stars) {
        const alpha = s.alpha + Math.sin(t * s.twinkleSpeed + s.twinkleOffset) * 0.3;
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.color},${Math.max(0, Math.min(1, alpha))})`;
        ctx.fill();
      }

      // shooting stars
      shootingStars = shootingStars.filter((s) => s.age < s.duration + 20);
      for (const s of shootingStars) {
        s.age += 1;
        s.x += s.dx;
        s.y += s.dy;
        s.progress = Math.min(s.age, s.duration);

        // fade in then out
        if (s.age < 10) s.alpha = s.age / 10;
        else if (s.age > s.duration) s.alpha = 1 - (s.age - s.duration) / 20;
        else s.alpha = 1;

        drawShootingStar(s);
      }

      frame = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.85,
      }}
    />
  );
}
