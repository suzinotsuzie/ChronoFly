import React from 'react';

/**
 * 一级页面「闹钟 / Wake Alarm」卡片背后的装饰层（Twin Pads + Rising Bud + Floating Petals + 径向柔光）。
 * 依赖全局 CSS 变量：--c-moss, --c-midnight, --c-dark, --c-rosy, --c-roseDeep（见 src/styles/theme.css）。
 */
export function AlarmHeroDecor() {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          borderRadius: 20,
          overflow: 'hidden',
        }}
        aria-hidden
      >
        {/* 左侧：Twin Pads */}
        <svg
          width="100"
          height="70"
          viewBox="0 0 160 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'absolute', left: -8, bottom: -5, opacity: 0.42 }}
        >
          <defs>
            <radialGradient id="alarm-padL-a" cx="42%" cy="38%" r="62%">
              <stop offset="0%" stopColor="var(--c-moss)" />
              <stop offset="100%" stopColor="var(--c-midnight)" />
            </radialGradient>
            <radialGradient id="alarm-padL-b" cx="48%" cy="42%" r="58%">
              <stop offset="0%" stopColor="var(--c-dark)" />
              <stop offset="100%" stopColor="var(--c-midnight)" />
            </radialGradient>
            <radialGradient id="alarm-budL" cx="50%" cy="35%" r="55%">
              <stop offset="0%" stopColor="#E4D5B7" />
              <stop offset="100%" stopColor="var(--c-rosy)" stopOpacity="0.5" />
            </radialGradient>
          </defs>
          <ellipse cx="80" cy="75" rx="70" ry="20" fill="var(--c-dark)" opacity="0.2" />
          <ellipse cx="95" cy="62" rx="36" ry="18" fill="url(#alarm-padL-b)" opacity="0.85" transform="rotate(-8 95 62)" />
          <path d="M95 44 L95 62" stroke="var(--c-midnight)" strokeWidth="1.2" opacity="0.4" />
          <ellipse cx="58" cy="68" rx="44" ry="22" fill="url(#alarm-padL-a)" opacity="0.9" transform="rotate(5 58 68)" />
          <path d="M58 46 L58 68" stroke="var(--c-midnight)" strokeWidth="1.5" opacity="0.45" />
          <path d="M58 68 Q38 60 20 63" stroke="var(--c-moss)" strokeWidth="0.8" fill="none" opacity="0.5" />
          <path d="M58 68 Q78 60 96 63" stroke="var(--c-moss)" strokeWidth="0.8" fill="none" opacity="0.5" />
          <path d="M95 44 Q98 36 95 30" stroke="var(--c-dark)" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
          <ellipse cx="95" cy="28" rx="5" ry="8" fill="url(#alarm-budL)" opacity="0.85" transform="rotate(10 95 28)" />
          <path d="M58 46 Q60 38 58 32" stroke="var(--c-dark)" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
          <ellipse cx="58" cy="24" rx="6" ry="10" fill="#E4D5B7" opacity="0.8" transform="rotate(0 58 24)" />
          <ellipse cx="58" cy="24" rx="6" ry="10" fill="var(--c-rosy)" opacity="0.6" transform="rotate(40 58 32)" />
          <ellipse cx="58" cy="24" rx="6" ry="10" fill="var(--c-rosy)" opacity="0.6" transform="rotate(-40 58 32)" />
          <circle cx="58" cy="30" r="4.5" fill="#D4A860" opacity="0.85" />
          <circle cx="58" cy="30" r="2.5" fill="#E4D5B7" opacity="0.65" />
        </svg>
        {/* 右侧：Rising Bud（竖茎 + 花蕾） */}
        <svg
          width="56"
          height="75"
          viewBox="0 0 80 110"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'absolute', right: 4, bottom: -2, opacity: 0.38 }}
        >
          <defs>
            <radialGradient id="alarm-padR" cx="44%" cy="40%" r="60%">
              <stop offset="0%" stopColor="var(--c-moss)" />
              <stop offset="100%" stopColor="var(--c-dark)" />
            </radialGradient>
            <linearGradient id="alarm-stemR" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--c-dark)" />
              <stop offset="100%" stopColor="var(--c-moss)" />
            </linearGradient>
          </defs>
          <ellipse cx="40" cy="88" rx="30" ry="10" fill="var(--c-dark)" opacity="0.25" />
          <ellipse cx="40" cy="84" rx="28" ry="14" fill="url(#alarm-padR)" opacity="0.88" />
          <path d="M40 70 L40 84" stroke="var(--c-midnight)" strokeWidth="1.2" opacity="0.4" />
          <path d="M40 84 Q26 78 14 80" stroke="var(--c-moss)" strokeWidth="0.7" fill="none" opacity="0.45" />
          <path d="M40 84 Q54 78 66 80" stroke="var(--c-moss)" strokeWidth="0.7" fill="none" opacity="0.45" />
          <path d="M40 84 Q43 65 40 18" stroke="url(#alarm-stemR)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          <ellipse cx="40" cy="16" rx="8" ry="14" fill="var(--c-rosy)" opacity="0.78" />
          <ellipse cx="40" cy="16" rx="5" ry="11" fill="#E4D5B7" opacity="0.72" />
          <ellipse cx="40" cy="16" rx="3" ry="8" fill="#E4D5B7" opacity="0.85" />
          <path d="M34 22 Q32 28 36 30" stroke="var(--c-dark)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.55" />
          <path d="M46 22 Q48 28 44 30" stroke="var(--c-dark)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.55" />
        </svg>
        {/* 中间：少量 Floating Petals */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'absolute', left: 0, top: 0, opacity: 0.28 }}
        >
          <defs>
            <radialGradient id="alarm-petalA" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#E4D5B7" />
              <stop offset="100%" stopColor="var(--c-rosy)" stopOpacity="0.5" />
            </radialGradient>
            <radialGradient id="alarm-petalB" cx="45%" cy="38%" r="58%">
              <stop offset="0%" stopColor="var(--c-rosy)" />
              <stop offset="100%" stopColor="var(--c-roseDeep)" stopOpacity="0.4" />
            </radialGradient>
          </defs>
          <ellipse cx="22" cy="28" rx="6" ry="3.5" fill="url(#alarm-petalA)" transform="rotate(-25 22 28)" />
          <ellipse cx="78" cy="22" rx="5" ry="3" fill="url(#alarm-petalB)" transform="rotate(15 78 22)" />
          <ellipse cx="82" cy="72" rx="5.5" ry="3" fill="url(#alarm-petalA)" transform="rotate(35 82 72)" />
          <ellipse cx="18" cy="78" rx="4" ry="2.5" fill="url(#alarm-petalB)" transform="rotate(-12 18 78)" />
        </svg>
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 65% 55% at 50% 60%, color-mix(in srgb, var(--c-rosy) 10%, transparent), transparent)',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}
