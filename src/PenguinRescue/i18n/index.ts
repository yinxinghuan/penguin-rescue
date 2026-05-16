type Locale = 'zh' | 'en';

function detectLocale(): Locale {
  const override = localStorage.getItem('game_locale');
  if (override === 'en' || override === 'zh') return override;
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

const dict: Record<Locale, Record<string, string>> = {
  zh: {
    title: 'Penguin Rescue',
    subtitle: '救小企鹅 · 躲贼鸥',
    tap_to_start: '点击开始',
    rescued: '救出了 {n} 只小企鹅',
    again: '再次挑战',
    score: '得分',
    high: '最高',
    loading: '努力加载中...',
    leaderboard: '排行榜',
  },
  en: {
    title: 'Penguin Rescue',
    subtitle: 'Save the babies. Dodge the skua.',
    tap_to_start: 'Tap to start',
    rescued: 'Rescued {n} babies',
    again: 'Try again',
    score: 'Score',
    high: 'Best',
    loading: 'Loading…',
    leaderboard: 'Leaderboard',
  },
};

let cur: Locale = detectLocale();

export function setLocale(l: Locale) {
  cur = l;
  localStorage.setItem('game_locale', l);
}

export function t(key: string, vars?: { n?: number | string }): string {
  const raw = dict[cur][key] ?? dict.en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String((vars as any)[k] ?? ''));
}

export function getLocale(): Locale { return cur; }
