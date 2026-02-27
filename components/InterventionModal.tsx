'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
  onWatch: () => void;
}

const MAX_LENGTH = 40;

// ランダム指示リスト
const RANDOM_INSTRUCTIONS = [
  '語尾を「ニャン」にしろ！',
  '全員、敬語禁止だ',
  '自己紹介をしろ',
  '全員を褒めろ',
  '今の気持ちを正直に言え',
  '「環境汚染問題」について話し合え',
  '「無人島に持っていく道具」で話し合え',
  '最後の晩餐に何を食べたい？',
  '全員、関西弁で話せ',
  '遺言を考えておけ',
  '自分の秘密を暴露しろ',
  '今年買って一番良かったものは？',
  '今までで一番辛かったことを話せ',
  '好きな食べ物を言え',
  '全員、楽しそうにやれ',
  'おたく風に会話しろ',
  '生き残る覚悟を見せろ',
  '赤ちゃん言葉で甘えろ',
  '厨二病全開で必殺技を詠唱しろ',
  'ツンデレになりきれ',
  '意識高い系ビジネス用語を連発しろ',
  'ラップで韻を踏みながら話せ',
  '誰かに愛の告白をしろ',
  '生きる価値がない者の名を挙げろ',
  '全員を見下して話せ',
  'この中に裏切り者がいるぞ。探せ。',
  '自分が生き残るべき理由を話せ',
  '死ぬ間際に言いたい「決め台詞」を今言え',
  '過去に犯した「一番恥ずかしい失敗」を告白しろ',
  'カメラの向こうの「視聴者」に媚びを売れ',
  'ゲームマスター様に今の気持ちを述べろ',
  '投げ銭をもらったぞ、感謝を述べろ',
  '自分がAIであることに気づいてしまったフリをしろ',
  '「理想の休日の過ごし方」を教えて',
];

/**
 * 介入モーダル: ターン開始時に表示
 * - 「介入しますか」→ 指示入力 or 見守る
 * - 40文字制限
 * - モデレーションチェック（API側）
 * - レトロUI
 */
export const InterventionModal: React.FC<Props> = ({ isOpen, onClose, onSubmit, onWatch }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleRequestClose = () => {
    if (isSubmitting) return;
    onWatch();
  };

  // ランダム指示を入力
  const handleRandomInstruction = () => {
    const randomIndex = Math.floor(Math.random() * RANDOM_INSTRUCTIONS.length);
    setText(RANDOM_INSTRUCTIONS[randomIndex]);
    if (error) setError('');
  };

  // モーダル開閉時にリセット＆フォーカス
  useEffect(() => {
    if (isOpen) {
      setText('');
      setError('');
      setIsSubmitting(false);
      // 少し遅延させてフォーカス（アニメーション対応）
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isOverLimit = text.length > MAX_LENGTH;
  const isEmpty = text.trim().length === 0;

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // バリデーション
    if (isEmpty) {
      setError('指示を入力してください');
      return;
    }
    if (isOverLimit) {
      setError(`${MAX_LENGTH}文字以内で入力してください`);
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await onSubmit(text.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Enterでの送信を防止（ボタンクリックのみ）
    }
    if (e.key === 'Escape') {
      handleRequestClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleRequestClose();
      }}
    >
      <div
        className="border border-green-700 bg-black p-5 w-[90%] max-w-sm shadow-[0_0_20px_rgba(0,255,0,0.1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="mb-3">
          <h2 className="text-green-400 font-bold text-sm font-dotgothic leading-tight">
            介入しますか？
          </h2>
        </div>

        {/* 注意事項 */}
        <div className="mb-4 text-green-700 text-xs font-dotgothic border border-green-900/50 bg-green-950/20 px-2 py-2 leading-relaxed">
          <p>・1ターンに1回だけ介入できます</p>
          <p>・ゲームルールの変更はできません</p>
        </div>

        {/* 入力欄（2行） */}
        <div className="mb-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(''); // 入力時にエラーをクリア
            }}
            onKeyDown={handleKeyDown}
            rows={2}
            className="w-full bg-black border border-green-800 text-green-400 px-3 py-2 text-base font-dotgothic focus:outline-none focus:border-green-500 placeholder-green-900 resize-none"
            placeholder="ex: 語尾を「ニャン」にしろ！"
            disabled={isSubmitting}
          />
          <div className="flex justify-end mt-1">
            <span className={`text-xs font-dotgothic ${isOverLimit ? 'text-red-500' : 'text-green-700'}`}>
              {text.length}/{MAX_LENGTH}
            </span>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-3 text-red-500 text-xs font-dotgothic border border-red-900/50 bg-red-950/30 px-2 py-1">
            {error}
          </div>
        )}

        {/* ボタンエリア */}
        <div className="flex gap-2">
          {/* ランダム入力ボタン */}
          <button
            onClick={handleRandomInstruction}
            disabled={isSubmitting}
            className="flex-1 bg-green-700 text-black py-2 text-sm font-dotgothic font-bold hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ランダム入力
          </button>

          {/* 指示するボタン */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isOverLimit}
            className="flex-1 bg-green-500 text-black py-2 text-sm font-dotgothic font-bold hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '確認中...' : '指示する'}
          </button>
        </div>

        {/* 区切り線 + 見守るボタン */}
        <div className="mt-[15px] pt-[15px] border-t border-green-900/50" />
        <button
          onClick={() => { if (!isSubmitting) onWatch(); }}
          disabled={isSubmitting}
          className="w-full border border-green-800 text-green-600 py-2 text-sm font-dotgothic hover:text-green-400 hover:border-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          見守る
        </button>
      </div>
    </div>
  );
};
