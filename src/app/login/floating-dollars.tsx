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
      'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.4)]', // Emerald Green
      'text-teal-400 drop-shadow-[0_0_10px_rgba(45,212,191,0.4)]',    // Teal
      'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]',   // Amber Gold
      'text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.3)]',    // Blue
      'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.4)]',   // Green
    ];

    const blurClasses = [
      'blur-[0.5px]',
      'blur-[1px]',
      'blur-[1.5px]',
      'blur-none',
      'blur-none',
    ];

    const generated: Dollar[] = Array.from({ length: 35 }).map((_, idx) => {
      const left = `${Math.random() * 100}%`;
      const fontSize = `${1.5 + Math.random() * 3}rem`; // between 1.5rem and 4.5rem
      const op = 0.12 + Math.random() * 0.23; // between 0.12 and 0.35 opacity
      const dur = `${10 + Math.random() * 15}s`; // between 10s and 25s
      const delay = `${Math.random() * 15}s`; // delay up to 15s
      const rot = `${(Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360)}deg`;
      const drift = `${(Math.random() > 0.5 ? 1 : -1) * (30 + Math.random() * 90)}px`;
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
            // @ts-ignore
            '--dur': dollar.dur,
            '--delay': dollar.delay,
            '--op': String(dollar.op),
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
