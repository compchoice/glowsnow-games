import { useEffect, useRef } from "react";

type Droplet = {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  opacity: number;
  phase: number;
};

/**
 * Full-screen canvas snowfall: soft purple-glowing droplets that drift down
 * with a gentle sway, thickening near the bottom of the screen.
 */
export function Snowfall({ enabled }: { enabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let droplets: Droplet[] = [];
    let raf = 0;
    let last = performance.now();

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    function makeDroplet(anywhere: boolean): Droplet {
      const r = rand(0.8, 3.4);
      return {
        x: rand(-40, width + 40),
        y: anywhere ? rand(-height, height) : rand(-60, -10),
        r,
        speed: rand(0.35, 1.1) * (0.6 + r / 4),
        drift: rand(-0.35, 0.35),
        opacity: rand(0.12, 0.45),
        phase: rand(0, Math.PI * 2),
      };
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const density = Math.min(Math.round((width * height) / 26000), 80);
      const count = Math.max(30, density);
      droplets = Array.from({ length: count }, () => makeDroplet(true));
    }

    function draw(now: number) {
      raf = requestAnimationFrame(draw);
      const dt = Math.min((now - last) / 16.7, 3);
      last = now;

      if (!enabledRef.current) {
        ctx!.clearRect(0, 0, width, height);
        return;
      }

      ctx!.clearRect(0, 0, width, height);
      ctx!.globalCompositeOperation = "lighter";

      for (const d of droplets) {
        d.phase += 0.008 * dt;
        d.x += (d.drift + Math.sin(d.phase) * 0.3) * dt;
        d.y += d.speed * dt;

        if (d.y > height + 12) {
          Object.assign(d, makeDroplet(false));
        }
        if (d.x < -50) d.x = width + 40;
        if (d.x > width + 50) d.x = -40;

        // Droplets get denser/brighter as they near the bottom
        const depth = Math.min(d.y / height, 1);
        const alpha = d.opacity * (0.45 + depth * 0.75);

        const glow = ctx!.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 4);
        glow.addColorStop(0, `rgba(216, 178, 255, ${alpha})`);
        glow.addColorStop(0.4, `rgba(168, 110, 255, ${alpha * 0.45})`);
        glow.addColorStop(1, "rgba(168, 110, 255, 0)");
        ctx!.fillStyle = glow;
        ctx!.beginPath();
        ctx!.arc(d.x, d.y, d.r * 4, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.fillStyle = `rgba(245, 238, 255, ${Math.min(alpha, 1)})`;
        ctx!.beginPath();
        ctx!.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    resize();
    window.addEventListener("resize", resize);

    if (reduceMotion) {
      // Draw one static frame so the mood is there without motion
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      for (const d of droplets) {
        const alpha = d.opacity;
        const glow = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 4);
        glow.addColorStop(0, `rgba(216, 178, 255, ${alpha})`);
        glow.addColorStop(1, "rgba(168, 110, 255, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] opacity-70"
    />
  );
}
