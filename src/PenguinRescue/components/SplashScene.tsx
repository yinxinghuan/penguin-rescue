// Pure SVG/CSS splash. No 3D Canvas → safe to mount during preload (no GPU cost).
// Designed to telegraph the game's threat-and-rescue loop:
//   1. circling skua up top
//   2. drifting baby penguins on the ice
//   3. falling snowflakes for ambiance
//   4. bold title + glowing CTA
import { useEffect, useState } from 'react';
import { t } from '../i18n';

interface Snowflake {
  id: number;
  x: number;        // 0..100 (%)
  delay: number;    // s
  duration: number; // s
  size: number;     // px
}

interface BabyBlob {
  id: number;
  x: number;        // 0..100 (%)
  y: number;        // 0..100 (%)
  delay: number;
  scale: number;
  color: string;
}

const BABY_COLORS = ['#1a2330', '#2c1a3a', '#3a2218', '#1a2e3d', '#231a3d', '#3a2a18'];

export function SplashScene({ onStart, highScore }: { onStart: () => void; highScore: number }) {
  // Snowflakes — pre-generated once for stable animation
  const [snow] = useState<Snowflake[]>(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: -Math.random() * 8,
      duration: 6 + Math.random() * 8,
      size: 3 + Math.random() * 6,
    }))
  );

  const [babies] = useState<BabyBlob[]>(() =>
    Array.from({ length: 7 }, (_, i) => ({
      id: i,
      x: 8 + Math.random() * 84,
      y: 58 + Math.random() * 28,
      delay: -Math.random() * 4,
      scale: 0.7 + Math.random() * 0.6,
      color: BABY_COLORS[i % BABY_COLORS.length],
    }))
  );

  // Force a tiny re-render after mount so CSS animations actually start
  // (avoids first-frame flash without animations applied).
  const [, force] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => force(1));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="pr-splash">
      {/* sky and ice gradient layers */}
      <div className="pr-splash__sky" />
      <div className="pr-splash__aurora" />
      <div className="pr-splash__ice" />

      {/* iceberg silhouettes back-left + back-right */}
      <svg className="pr-splash__icebergs" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points="0,72 10,55 18,68 14,80 4,82" fill="#c3dce9" />
        <polygon points="14,80 22,62 28,76 30,84" fill="#dbeaf3" />
        <polygon points="78,84 84,68 90,78 96,72 100,82 100,100 78,100" fill="#c3dce9" />
        <polygon points="68,86 76,74 82,86" fill="#dbeaf3" />
        <polygon points="44,82 50,72 56,82 52,88" fill="#d0e3ee" opacity=".7" />
      </svg>

      {/* falling snowflakes */}
      <div className="pr-splash__snow">
        {snow.map(f => (
          <div
            key={f.id}
            className="pr-splash__flake"
            style={{
              left: `${f.x}%`,
              width: `${f.size}px`,
              height: `${f.size}px`,
              animationDelay: `${f.delay}s`,
              animationDuration: `${f.duration}s`,
            }}
          />
        ))}
      </div>

      {/* drifting baby penguins (CSS sprites) */}
      <div className="pr-splash__babies">
        {babies.map(b => (
          <div
            key={b.id}
            className="pr-splash__baby"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              transform: `scale(${b.scale})`,
              animationDelay: `${b.delay}s`,
            }}
          >
            <div className="pr-splash__baby-body" style={{ background: b.color }} />
            <div className="pr-splash__baby-belly" />
            <div className="pr-splash__baby-beak" />
            <div className="pr-splash__baby-eye pr-splash__baby-eye--l" />
            <div className="pr-splash__baby-eye pr-splash__baby-eye--r" />
          </div>
        ))}
      </div>

      {/* circling skua silhouette in the sky with a moving shadow on the ice */}
      <div className="pr-splash__skua-shadow" />
      <div className="pr-splash__skua">
        <svg viewBox="-60 -30 120 60" width="180" height="90">
          {/* body */}
          <ellipse cx="0" cy="0" rx="14" ry="6" fill="#3d2918" />
          {/* head + beak */}
          <ellipse cx="14" cy="-1" rx="6" ry="5" fill="#3d2918" />
          <polygon points="20,-1 28,0 20,3" fill="#f7c64a" />
          {/* wings — large spread, gives it a menacing silhouette */}
          <path d="M -2,-2 Q -25,-22 -52,-12 Q -30,-4 -2,2 Z" fill="#2a1810" />
          <path d="M  2,-2 Q  25,-22  52,-12 Q  30,-4  2,2 Z" fill="#2a1810" />
          {/* tail */}
          <polygon points="-14,0 -22,3 -22,-3" fill="#3d2918" />
          {/* eye glint */}
          <circle cx="15" cy="-2" r="1.4" fill="#fff8d6" />
          <circle cx="15.5" cy="-2" r="0.7" fill="#000" />
        </svg>
      </div>

      {/* foreground content */}
      <div className="pr-splash__content">
        <div className="pr-splash__eyebrow">ANTARCTIC · INSTANT PLAY</div>
        <h1 className="pr-splash__title">
          <span className="pr-splash__title-emph">Penguin</span>
          <span className="pr-splash__title-emph pr-splash__title-emph--accent">Rescue</span>
        </h1>
        <p className="pr-splash__subtitle">{t('subtitle')}</p>

        <div className="pr-splash__rules">
          <div className="pr-splash__rule">
            <span className="pr-splash__rule-icon pr-splash__rule-icon--baby" />
            <span>{t('rule_collect')}</span>
          </div>
          <div className="pr-splash__rule">
            <span className="pr-splash__rule-icon pr-splash__rule-icon--skua" />
            <span>{t('rule_dodge')}</span>
          </div>
          <div className="pr-splash__rule">
            <span className="pr-splash__rule-icon pr-splash__rule-icon--joystick" />
            <span>{t('rule_control')}</span>
          </div>
        </div>

        {highScore > 0 && (
          <div className="pr-splash__best">{t('high')} · {highScore}</div>
        )}

        <button className="pr-splash__cta" onPointerDown={onStart}>
          <span className="pr-splash__cta-text">{t('tap_to_start')}</span>
          <span className="pr-splash__cta-pulse" aria-hidden />
        </button>
      </div>
    </div>
  );
}
