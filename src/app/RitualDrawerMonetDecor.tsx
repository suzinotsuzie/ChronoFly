import React from 'react';

/**
 * My Ritual 抽屉右下角：与一级页 `AlarmHeroDecor` 同源矢量（Twin Pads 局部 + Rising Bud + 两枚飘瓣），
 * id 前缀 `ritualDrawer-` 避免与闹钟层冲突；无 CSS 模糊、无 SVG feBlur。
 */
export function RitualDrawerMonetDecor() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        right: -4,
        bottom: 'calc(2px + env(safe-area-inset-bottom, 0px))',
        width: 132,
        height: 108,
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.4,
      }}
    >
      <svg width="132" height="108" viewBox="0 0 132 108" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="ritualDrawer-padL-a" cx="42%" cy="38%" r="62%">
            <stop offset="0%" stopColor="var(--c-moss)" />
            <stop offset="100%" stopColor="var(--c-midnight)" />
          </radialGradient>
          <radialGradient id="ritualDrawer-padL-b" cx="48%" cy="42%" r="58%">
            <stop offset="0%" stopColor="var(--c-dark)" />
            <stop offset="100%" stopColor="var(--c-midnight)" />
          </radialGradient>
          <radialGradient id="ritualDrawer-budL" cx="50%" cy="35%" r="55%">
            <stop offset="0%" stopColor="#E4D5B7" />
            <stop offset="100%" stopColor="var(--c-rosy)" stopOpacity="0.5" />
          </radialGradient>
          <radialGradient id="ritualDrawer-padR" cx="44%" cy="40%" r="60%">
            <stop offset="0%" stopColor="var(--c-moss)" />
            <stop offset="100%" stopColor="var(--c-dark)" />
          </radialGradient>
          <linearGradient id="ritualDrawer-stemR" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--c-dark)" />
            <stop offset="100%" stopColor="var(--c-moss)" />
          </linearGradient>
          <radialGradient id="ritualDrawer-petalA" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#E4D5B7" />
            <stop offset="100%" stopColor="var(--c-rosy)" stopOpacity="0.5" />
          </radialGradient>
          <radialGradient id="ritualDrawer-petalB" cx="45%" cy="38%" r="58%">
            <stop offset="0%" stopColor="var(--c-rosy)" />
            <stop offset="100%" stopColor="var(--c-roseDeep)" stopOpacity="0.4" />
          </radialGradient>
        </defs>

        <g opacity={0.95}>
          <ellipse cx="24" cy="22" rx="6" ry="3.5" fill="url(#ritualDrawer-petalA)" transform="rotate(-25 24 22)" />
          <ellipse cx="58" cy="14" rx="5" ry="3" fill="url(#ritualDrawer-petalB)" transform="rotate(15 58 14)" />
        </g>

        <g transform="translate(-6 8) scale(0.52)" opacity={0.92}>
          <ellipse cx="95" cy="62" rx="36" ry="18" fill="url(#ritualDrawer-padL-b)" opacity="0.85" transform="rotate(-8 95 62)" />
          <path d="M95 44 L95 62" stroke="var(--c-midnight)" strokeWidth="1.2" opacity="0.4" />
          <ellipse cx="58" cy="68" rx="44" ry="22" fill="url(#ritualDrawer-padL-a)" opacity="0.9" transform="rotate(5 58 68)" />
          <path d="M58 46 L58 68" stroke="var(--c-midnight)" strokeWidth="1.5" opacity="0.45" />
          <path d="M58 68 Q38 60 20 63" stroke="var(--c-moss)" strokeWidth="0.8" fill="none" opacity="0.5" />
          <path d="M58 68 Q78 60 96 63" stroke="var(--c-moss)" strokeWidth="0.8" fill="none" opacity="0.5" />
          <path d="M95 44 Q98 36 95 30" stroke="var(--c-dark)" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
          <ellipse cx="95" cy="28" rx="5" ry="8" fill="url(#ritualDrawer-budL)" opacity="0.85" transform="rotate(10 95 28)" />
        </g>

        <g transform="translate(72 6) scale(0.58)" opacity={0.95}>
          <ellipse cx="40" cy="88" rx="30" ry="10" fill="var(--c-dark)" opacity="0.25" />
          <ellipse cx="40" cy="84" rx="28" ry="14" fill="url(#ritualDrawer-padR)" opacity="0.88" />
          <path d="M40 70 L40 84" stroke="var(--c-midnight)" strokeWidth="1.2" opacity="0.4" />
          <path d="M40 84 Q26 78 14 80" stroke="var(--c-moss)" strokeWidth="0.7" fill="none" opacity="0.45" />
          <path d="M40 84 Q54 78 66 80" stroke="var(--c-moss)" strokeWidth="0.7" fill="none" opacity="0.45" />
          <path
            d="M40 84 Q43 65 40 18"
            stroke="url(#ritualDrawer-stemR)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
          <ellipse cx="40" cy="16" rx="8" ry="14" fill="var(--c-rosy)" opacity="0.78" />
          <ellipse cx="40" cy="16" rx="5" ry="11" fill="#E4D5B7" opacity="0.72" />
          <ellipse cx="40" cy="16" rx="3" ry="8" fill="#E4D5B7" opacity="0.85" />
          <path d="M34 22 Q32 28 36 30" stroke="var(--c-dark)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.55" />
          <path d="M46 22 Q48 28 44 30" stroke="var(--c-dark)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.55" />
        </g>
      </svg>
    </div>
  );
}
