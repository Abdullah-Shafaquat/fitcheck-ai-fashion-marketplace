"use client";

import { useRef, useState, useCallback, ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Max tilt in degrees */
  max?: number;
  /** Enable glare sweep */
  glare?: boolean;
  scale?: number;
}

export default function TiltCard({
  children,
  className,
  max = 10,
  glare = true,
  scale = 1.02,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [rot, setRot] = useState({ x: 0, y: 0 });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el || reduce) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      setRot({ y: (px - 0.5) * max * 2, x: (0.5 - py) * max * 2 });
      setGlarePos({ x: px * 100, y: py * 100 });
    },
    [max, reduce]
  );

  const onLeave = useCallback(() => {
    setRot({ x: 0, y: 0 });
    setHovered(false);
  }, []);

  return (
    <div className="perspective" style={{ touchAction: "pan-y" }}>
      <motion.div
        ref={ref}
        className={className}
        style={{ rotateX: rot.x, rotateY: rot.y, transformStyle: "preserve-3d" }}
        whileHover={reduce ? undefined : { scale }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        onMouseMove={onMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={onLeave}
      >
        {children}
        {glare && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
            style={{
              background: `radial-gradient(420px circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.10), transparent 45%)`,
              opacity: hovered && !reduce ? 1 : 0,
              transition: "opacity 0.3s",
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
