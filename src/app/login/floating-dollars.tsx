'use client';

import { useEffect, useState } from 'react';

interface Dollar {
  id: number;
  left: string;
  fontSize: string;
  op: number;
  dur: string;
  delay: string;
  rot: string;
  drift: string;
  colorClass: string;
  blurClass: string;
}

export function FloatingDollars() {
  const [dollars, setDollars] = useState<Dollar[]>([]);

  useEffect(() => {
    const colorClasses = [
      'text-emerald-500/20 drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]', // Emerald Green
      'text-teal-400/20 drop-shadow-[0_0_8px_rgba(45,212,191,0.2)]',    // Teal
      'text-amber-500/20 drop-shadow-[0_0_8px_rgba(245,158,11,0.2)]',   // Amber Gold
      'text-blue-500/15 drop-shadow-[0_0_8px_rgba(59,130,246,0.15)]',   // Subtle Blue
      'text-green-600/20 drop-shadow-[0_0_8px_rgba(22,163,74,0.2)]',    // Pure Green
    ];

    const blurClasses = [
      'blur-[0.5px]',
      'blur-[1px]',
      'blur-[1.5px]',
      'blur-none',
      'blur-none',
    ];

    const generated: Dollar[] = Array.from({ length: 30 }).map((_, idx) => {
      const left = `${Math.random() * 100}%`;
      const fontSize = `${1.2 + Math.random() * 2.8}rem`; // between 1.2rem and 4rem
      const op = 0.05 + Math.random() * 0.18; // between 0.05 and 0.23 opacity
      const dur = `${8 + Math.random() * 14}s`; // between 8s and 22s
      const delay = `${Math.random() * 12}s`; // delay up to 12s
      const rot = `${(Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360)}deg`; // rotation direction & amount
      const drift = `${(Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 80)}px`; // horizontal drift amount
      const colorClass = colorClasses[Math.floor(Math.random() * colorClasses.length)];
      const blurClass = blurClasses[Math.floor(Math.random() * blurClasses.length)];

      return {
        id: idx,
        left,
        fontSize,
        op,
        dur,
        delay,
        rot,
        drift,
        colorClass,
        blurClass,
      };
    });

    setDollars(generated);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {dollars.map((dollar) => (
        <span
          key={dollar.id}
          className={`absolute bottom-[-10%] select-none font-black animate-float-money ${dollar.colorClass} ${dollar.blurClass}`}
          style={{
            left: dollar.left,
            fontSize: dollar.fontSize,
            // Pass custom css variables to hook into keyframes
            // @ts-ignore
            '--dur': dollar.dur,
            '--delay': dollar.delay,
            '--op': dollar.op,
            '--rot': dollar.rot,
            '--drift': dollar.drift,
          }}
        >
          $
        </span>
      ))}
    </div>
  );
}
