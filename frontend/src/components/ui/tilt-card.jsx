import React, { useRef, useCallback } from "react";
import { cn } from "../../lib/utils";

export function TiltCard({
  tiltLimit = 8,
  scale = 1.02,
  perspective = 1000,
  effect = "evade",
  spotlight = true,
  className,
  style,
  children,
  ...props
}) {
  const cardRef = useRef(null);
  const spotlightRef = useRef(null);
  const rafId = useRef(null);

  const dir = effect === "evade" ? -1 : 1;

  const handlePointerMove = useCallback(
    (e) => {
      // Skip tilt on touch devices for silky scroll performance
      if (e.pointerType === 'touch') return;

      const el = cardRef.current;
      if (!el) return;

      if (rafId.current) cancelAnimationFrame(rafId.current);

      rafId.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const xRot = (py - 0.5) * (tiltLimit * 2) * dir;
        const yRot = (px - 0.5) * -(tiltLimit * 2) * dir;

        el.style.transform = `perspective(${perspective}px) rotateX(${xRot.toFixed(2)}deg) rotateY(${yRot.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;
        
        if (spotlight && spotlightRef.current) {
          spotlightRef.current.style.opacity = '1';
          spotlightRef.current.style.left = `${(px * 100).toFixed(1)}%`;
          spotlightRef.current.style.top = `${(py * 100).toFixed(1)}%`;
        }
      });
    },
    [tiltLimit, scale, perspective, dir, spotlight]
  );

  const handlePointerEnter = useCallback(() => {
    const el = cardRef.current;
    if (el) {
      el.style.transition = "transform 0.15s ease-out";
      el.style.zIndex = "10";
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    const el = cardRef.current;
    if (el) {
      el.style.transition = "transform 0.4s ease-out";
      el.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
      el.style.zIndex = "1";
    }
    if (spotlightRef.current) {
      spotlightRef.current.style.opacity = '0';
    }
  }, [perspective]);

  return (
    <div
      ref={cardRef}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn("relative overflow-hidden", className)}
      style={{
        transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
        transformStyle: "preserve-3d",
        transition: "transform 0.3s ease-out",
        ...style,
      }}
      {...props}
    >
      {children}
      {spotlight && (
        <div
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]"
        >
          <div
            ref={spotlightRef}
            className="absolute w-[200%] h-[200%] rounded-full opacity-0 dark:opacity-0 pointer-events-none"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              transition: "opacity 0.25s ease",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 45%)",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default TiltCard;
