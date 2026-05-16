import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Leaderboard, useGameScore } from '@shared/leaderboard';
import { Scene } from './components/Scene';
import { createGameState } from './hooks/useGameLoop';
import { useJoystick } from './hooks/useJoystick';
import { playSfx, startBgm, stopBgm, unlockAudio } from './utils/audio';
import { t } from './i18n';
import alteruSvg from './img/alteru.svg';
import './PenguinRescue.less';

type Phase = 'splash' | 'playing' | 'gameover';

const HIGH_KEY = 'penguin_rescue_high';

export function PenguinRescue() {
  const [phase, setPhase] = useState<Phase>('splash');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => Number(localStorage.getItem(HIGH_KEY) || 0));
  const [finalScore, setFinalScore] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const stateRef = useRef(createGameState());
  const { stickRef, view } = useJoystick(phase === 'playing');

  const {
    isInAigram, submitScore, fetchGlobalLeaderboard, fetchFriendsLeaderboard,
  } = useGameScore('penguin-rescue');

  const haptic = useCallback((kind: 'light' | 'heavy') => {
    if (!('vibrate' in navigator)) return;
    navigator.vibrate(kind === 'heavy' ? 35 : 12);
  }, []);

  const onScore = useCallback((s: number) => {
    setScore(s);
  }, []);

  const onGameOver = useCallback((final: number) => {
    setFinalScore(final);
    setPhase('gameover');
    stopBgm();
    if (final > highScore) {
      localStorage.setItem(HIGH_KEY, String(final));
      setHighScore(final);
    }
    submitScore(final).catch(() => { /* silent */ });
  }, [highScore, submitScore]);

  const start = useCallback(async () => {
    await unlockAudio();
    stateRef.current = createGameState();
    setScore(0);
    setPhase('playing');
    startBgm(0.06);
  }, []);

  // stop bgm on unmount
  useEffect(() => () => { stopBgm(); }, []);

  return (
    <div className="pr">
      <div className="pr__canvas">
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
          <Scene
            state={stateRef}
            playing={phase === 'playing'}
            stickRef={stickRef}
            onScore={onScore}
            onGameOver={onGameOver}
            playSfx={playSfx}
            haptic={haptic}
          />
        </Canvas>
      </div>

      {/* HUD */}
      <div className="pr__hud">
        <div className="pr__score">
          <div>
            <div className="pr__score-label">{t('score')}</div>
            <div>{score}</div>
          </div>
          {highScore > 0 && (
            <div className="pr__hi">{t('high')} {highScore}</div>
          )}
        </div>
        <img className="pr__watermark" src={alteruSvg} alt="AlterU" />
      </div>

      {/* Joystick visual */}
      {view.active && (
        <div className="pr__joystick" style={{ left: view.ox, top: view.oy }}>
          <div className="pr__joystick__ring">
            <div className="pr__joystick__stick" style={{ transform: `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px))` }} />
          </div>
        </div>
      )}

      {/* Splash */}
      {phase === 'splash' && (
        <div className="pr__splash">
          <h1 className="pr__title">{t('title')}</h1>
          <p className="pr__subtitle">{t('subtitle')}</p>
          <button className="pr__cta" onPointerDown={start}>
            {t('tap_to_start')}
          </button>
        </div>
      )}

      {/* Game over */}
      {phase === 'gameover' && (
        <div className="pr__gameover">
          <div className="pr__final-score">{finalScore}</div>
          <div className="pr__final">{t('rescued', { n: finalScore })}</div>
          <button className="pr__cta" onPointerDown={start}>
            {t('again')}
          </button>
          {isInAigram && (
            <button className="pr__leaderboard-btn" onPointerDown={() => setShowLeaderboard(true)}>
              {t('leaderboard')}
            </button>
          )}
        </div>
      )}

      {showLeaderboard && (
        <Leaderboard
          gameName={t('title')}
          isInAigram={isInAigram}
          onClose={() => setShowLeaderboard(false)}
          fetchGlobal={fetchGlobalLeaderboard}
          fetchFriends={fetchFriendsLeaderboard}
        />
      )}
    </div>
  );
}
