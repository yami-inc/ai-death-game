'use client';

import React, { useEffect, useRef, useState } from 'react';
import { audioService } from '@/lib/audio';

// ダイアログの表示フェーズ（親に通知用）
export type DialogPhase = 'idle' | 'thought' | 'waitThought' | 'speech' | 'done';

// コンテンツフェーズ（親が指定する表示内容）
export type ContentPhase = 'thought' | 'speech';

interface Props {
  agentName: string | null;
  agentId: string | null;
  thought: string;
  speech: string;
  /** 現在表示するコンテンツフェーズ（親が制御）*/
  contentPhase: ContentPhase;
  /** タイプライター表示中 */
  isTyping: boolean;
  /** タップ待ち状態 */
  waitingForTap: boolean;
  /** 一意のコンテンツキー（変更時にタイプライターをリセット）*/
  contentKey?: string;
  isMaster?: boolean; // 司会キャラかどうか（思考なし、発言のみ）
  isEliminationReaction?: boolean; // 断末魔ログかどうか（思考なし、発言のみ、赤色）
  isThinking?: boolean; // 「（考え中）」表示モード（API待ち）
  isVoting?: boolean; // 「（投票中...）」表示モード（投票API待ち）
  isExecuting?: boolean; // 処刑演出中（fainted画像表示中、タップで次へ）
  onTap: () => void;
  onTypingComplete: () => void;
  onMouthOpen: (open: boolean) => void;
  onPhaseChange?: (phase: DialogPhase) => void; // フェーズ変更通知（表情切替用）
}

/**
 * ダイアログエリア: 思考と発言のテキスト表示（ステートレス版）
 * - 親が contentPhase で「thought」か「speech」を指定
 * - 思考フェーズ: 思考をタイプライター表示
 * - 発言フェーズ: 完了した思考 + 発言をタイプライター表示（両方表示）
 * - タイプライター完了時に onTypingComplete を呼ぶ
 */
export const DialogArea: React.FC<Props> = ({
  agentName,
  agentId,
  thought,
  speech,
  contentPhase,
  isTyping,
  waitingForTap,
  contentKey,
  isMaster = false,
  isEliminationReaction = false,
  isThinking = false,
  isVoting = false,
  isExecuting = false,
  onTap,
  onTypingComplete,
  onMouthOpen,
  onPhaseChange,
}) => {
  // 思考のタイプライター進行状況
  const [thoughtDisplayedLength, setThoughtDisplayedLength] = useState(0);
  // 発言のタイプライター進行状況
  const [speechDisplayedLength, setSpeechDisplayedLength] = useState(0);
  // タイプライター完了フラグ（現在のフェーズ）
  const [typingDone, setTypingDone] = useState(false);

  // 「考え中...」「投票中...」のドットアニメーション用
  const [thinkingDots, setThinkingDots] = useState(0);
  const [votingDots, setVotingDots] = useState(0);
  const thinkingDotsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const votingDotsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const typewriterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mouthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 同一フェーズでの完了通知重複を防ぐ
  const typingCompleteNotifiedRef = useRef<string | null>(null);

  // 前回のcontentKeyを追跡（変更時にタイプライターをリセット）
  const prevContentKeyRef = useRef<string | undefined>(undefined);
  // 前回のcontentPhaseを追跡
  const prevContentPhaseRef = useRef<ContentPhase>(contentPhase);

  // 現在表示対象のテキスト（タイプライター対象）
  const currentText = contentPhase === 'thought' ? thought : speech;
  const currentDisplayedLength = contentPhase === 'thought' ? thoughtDisplayedLength : speechDisplayedLength;
  const setCurrentDisplayedLength = contentPhase === 'thought' ? setThoughtDisplayedLength : setSpeechDisplayedLength;

  // 表示用テキスト
  const displayedThoughtText = thought.substring(0, thoughtDisplayedLength);
  const displayedSpeechText = speech.substring(0, speechDisplayedLength);
  const typingPhaseToken = `${contentKey ?? '__none__'}::${contentPhase}::${currentText.length}`;

  // contentKeyが変わったら全てリセット、contentPhaseが変わったら発言のみリセット
  useEffect(() => {
    const keyChanged = contentKey !== prevContentKeyRef.current;
    const phaseChanged = contentPhase !== prevContentPhaseRef.current;

    if (keyChanged) {
      // 新しいログ: 全てリセット
      setThoughtDisplayedLength(0);
      setSpeechDisplayedLength(0);
      setTypingDone(false);
      typingCompleteNotifiedRef.current = null;
      prevContentKeyRef.current = contentKey;
      prevContentPhaseRef.current = contentPhase;
    } else if (phaseChanged) {
      // 同じログでフェーズ変更: 発言のみリセット（思考は維持）
      setSpeechDisplayedLength(0);
      setTypingDone(false);
      typingCompleteNotifiedRef.current = null;
      prevContentPhaseRef.current = contentPhase;
    }
  }, [contentKey, contentPhase]);

  // タイプライター効果
  useEffect(() => {
    // タイピング中でなければ何もしない
    if (!isTyping || typingDone) {
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
        typewriterIntervalRef.current = null;
      }
      return;
    }

    // テキストがなければ即完了
    if (currentText.length === 0) {
      setTypingDone(true);
      if (typingCompleteNotifiedRef.current !== typingPhaseToken) {
        typingCompleteNotifiedRef.current = typingPhaseToken;
        onTypingComplete();
      }
      return;
    }

    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current);
    }

    const typeSpeed = 30;

    typewriterIntervalRef.current = setInterval(() => {
      setCurrentDisplayedLength((prev) => {
        const next = prev + 1;
        // Beep音
        const beepInterval = contentPhase === 'thought' ? 4 : 2;
        if (next % beepInterval === 0 && agentId) {
          audioService.playTypingBlip(agentId);
        }

        if (next >= currentText.length) {
          // タイピング完了
          setTypingDone(true);
          // 次のレンダーサイクルで親に通知
          setTimeout(() => {
            if (typingCompleteNotifiedRef.current !== typingPhaseToken) {
              typingCompleteNotifiedRef.current = typingPhaseToken;
              onTypingComplete();
            }
          }, 0);
        }
        return Math.min(next, currentText.length);
      });
    }, typeSpeed);

    return () => {
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
      }
    };
  }, [isTyping, typingDone, currentText, contentPhase, agentId, onTypingComplete, setCurrentDisplayedLength, typingPhaseToken]);

  // 口パク制御（発言フェーズ中かつタイピング中）
  useEffect(() => {
    if (contentPhase === 'speech' && isTyping && !typingDone) {
      let nextMouthOpen = false;
      mouthIntervalRef.current = setInterval(() => {
        nextMouthOpen = !nextMouthOpen;
        onMouthOpen(nextMouthOpen);
      }, 100);

      return () => {
        if (mouthIntervalRef.current) {
          clearInterval(mouthIntervalRef.current);
        }
        onMouthOpen(false);
      };
    } else {
      onMouthOpen(false);
    }
  }, [contentPhase, isTyping, typingDone, onMouthOpen]);

  // フェーズ変更を親に通知（表情切替用）
  useEffect(() => {
    let phase: DialogPhase;
    if (isThinking || isVoting) {
      phase = 'idle';
    } else if (contentPhase === 'thought') {
      if (isTyping && !typingDone) {
        phase = 'thought';
      } else if (waitingForTap) {
        phase = 'waitThought';
      } else {
        phase = 'idle';
      }
    } else {
      // speech
      if (isTyping && !typingDone) {
        phase = 'speech';
      } else if (waitingForTap) {
        phase = 'done';
      } else {
        phase = 'idle';
      }
    }
    onPhaseChange?.(phase);
  }, [contentPhase, isTyping, typingDone, waitingForTap, isThinking, isVoting, onPhaseChange]);

  // 考え中アニメーション（...をループ）
  useEffect(() => {
    if (isThinking && !isVoting) {
      thinkingDotsIntervalRef.current = setInterval(() => {
        setThinkingDots((prev) => (prev + 1) % 4);
      }, 300);

      return () => {
        if (thinkingDotsIntervalRef.current) {
          clearInterval(thinkingDotsIntervalRef.current);
        }
      };
    } else {
      setThinkingDots(0);
      if (thinkingDotsIntervalRef.current) {
        clearInterval(thinkingDotsIntervalRef.current);
      }
    }
  }, [isThinking, isVoting]);

  // 投票中アニメーション（...をループ）
  useEffect(() => {
    if (isVoting) {
      votingDotsIntervalRef.current = setInterval(() => {
        setVotingDots((prev) => (prev + 1) % 4);
      }, 300);

      return () => {
        if (votingDotsIntervalRef.current) {
          clearInterval(votingDotsIntervalRef.current);
        }
      };
    } else {
      setVotingDots(0);
      if (votingDotsIntervalRef.current) {
        clearInterval(votingDotsIntervalRef.current);
      }
    }
  }, [isVoting]);

  // タップハンドラ
  const handleInternalTap = () => {
    // デバッグ: タップ時の状態を出力

    // 処刑演出中は直接親に通知
    if (isExecuting) {
      onTap();
      return;
    }

    // タップ待ち状態でなければ何もしない
    if (!waitingForTap) {
      return;
    }

    // 親に通知（親が次のアクションを決定）
    onTap();
  };

  // カーソル
  const Cursor = () => (
    <span className="animate-pulse inline-block w-2 h-5 ml-0.5 align-middle bg-green-400" />
  );

  // 状態判定
  const isCurrentlyTyping = isTyping && !typingDone;
  const isLoadingState = !isThinking && !isVoting && !isExecuting && currentText.length === 0;

  // 思考を表示するか: 思考がある && MASTERでない && 考え中・投票中でない
  // 発言フェーズでも思考は完了済みとして表示する
  const hasThought = thought.length > 0 && !isMaster && !isThinking && !isVoting;
  const showThought = hasThought && (contentPhase === 'thought' || contentPhase === 'speech');
  const thoughtComplete = contentPhase === 'speech'; // 発言フェーズなら思考は完了済み

  // 発言を表示するか: 発言フェーズ && 発言がある
  const showSpeech = contentPhase === 'speech' && speech.length > 0 && !isThinking && !isVoting;

  return (
    <div
      className="h-full flex flex-col border-t border-green-900 bg-black cursor-pointer select-none"
      onClick={handleInternalTap}
    >
      {/* 名前ラベル */}
      {agentName && (
        <div className="px-4 pt-3">
          <span className="text-green-400 font-bold">[ {agentName} ]</span>
        </div>
      )}

      {/* テキストエリア */}
      <div className="flex-1 px-4 py-2 overflow-y-auto font-dotgothic">
        {/* 処刑演出中 */}
        {isExecuting && (
          <div className="flex items-center">
            <span className="text-red-400 text-base animate-pulse">[ 削除中... ]</span>
          </div>
        )}

        {/* 考え中（API待ち） */}
        {!isExecuting && isThinking && !isVoting && (
          <div className="flex items-center">
            <span className="text-green-700 text-base">
              （考え中{'.'.repeat(thinkingDots)}）
            </span>
          </div>
        )}

        {/* 投票中...（投票API待ち） */}
        {!isExecuting && isVoting && (
          <div className="flex items-center">
            <span className="text-green-700 text-base">
              （投票中{'.'.repeat(votingDots)}）
            </span>
          </div>
        )}

        {/* ローディング中（考え中・投票中・処刑演出中でない場合） */}
        {isLoadingState && !isExecuting && (
          <div className="flex items-center">
            <Cursor />
          </div>
        )}

        {/* 思考（MASTERは思考なし）*/}
        {showThought && (
          <div className="mb-2">
            <span className="text-green-700 text-base">
              {/* 思考フェーズ: タイプライター表示 */}
              {contentPhase === 'thought' && (
                <>
                  （{displayedThoughtText}
                  {isCurrentlyTyping && <Cursor />}
                  {(typingDone || waitingForTap) && '）'}
                </>
              )}
              {/* 発言フェーズ: 思考は完了済みとして全文表示 */}
              {contentPhase === 'speech' && `（${thought}）`}
            </span>
          </div>
        )}

        {/* 発言 */}
        {showSpeech && (
          <div>
            <span className={isMaster || isEliminationReaction ? "text-red-400 text-lg whitespace-pre-wrap" : "text-green-400 text-lg whitespace-pre-wrap"}>
              {!isMaster && '「'}{displayedSpeechText}
              {isCurrentlyTyping && <Cursor />}
              {(typingDone || waitingForTap) && !isMaster && '」'}
            </span>
          </div>
        )}
      </div>

      {/* フッター（タップ誘導） */}
      <div className="h-10 flex items-center justify-end px-4 mb-6 sm:mb-[calc(1.5rem+30px)]">
        {/* タップ誘導 */}
        <div className="flex items-center gap-2">
          {/* 処刑演出中: 明るい緑で点滅 */}
          {isExecuting && (
            <span className="animate-pulse text-green-400 font-bold">▼</span>
          )}

          {/* タップ可能時: 明るい緑で点滅（考え中・投票中・処刑演出中は除外） */}
          {!isExecuting && waitingForTap && !isThinking && !isVoting && (
            <span className="animate-pulse text-green-400 font-bold">▼</span>
          )}

          {/* タイプ中: 薄い▼ + ... */}
          {!isExecuting && isCurrentlyTyping && !isThinking && !isVoting && (
            <>
              <span className="text-green-800 text-xs">...</span>
              <span className="text-green-900">▼</span>
            </>
          )}

          {/* ローディング中: 薄い▼ + LOADING（考え中・投票中・処刑演出中は除外） */}
          {!isExecuting && isLoadingState && (
            <>
              <span className="text-green-800 text-xs animate-pulse">LOADING</span>
              <span className="text-green-900">▼</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
