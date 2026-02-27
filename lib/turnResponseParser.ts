import { type Expression, type TurnResponse } from './types';

// 発話量が介入で増殖しないように、最終出力に上限をかける
const MAX_DISCUSSION_THOUGHT_CHARS = 400;
const MAX_DISCUSSION_SPEECH_CHARS = 800;
const MAX_DISCUSSION_SENTENCES = 6;

const clampBySentenceCount = (text: string, maxSentences: number): string => {
  if (!text) return '';
  const sentences = text.match(/[^。！？!?]+[。！？!?]?/g);
  if (!sentences || sentences.length <= maxSentences) return text.trim();
  return sentences.slice(0, maxSentences).join('').trim();
};

const clampByCharCount = (text: string, maxChars: number): string => {
  if (text.length <= maxChars) return text;
  const clipped = text.slice(0, maxChars).trimEnd();
  return clipped ? `${clipped}…` : '';
};

const clampDiscussionText = (text: string, maxChars: number): string => {
  const sentenceLimited = clampBySentenceCount(text, MAX_DISCUSSION_SENTENCES);
  return clampByCharCount(sentenceLimited, maxChars);
};

// ストリームレスポンスをパースする関数
export const parseStreamResponse = (text: string): TurnResponse => {
  // [expression]thought|||[expression]speech 形式をパース
  let parts = text.split('|||');

  // ||| がない場合、2つ目の表情タグ位置で分割を試みる
  if (parts.length < 2) {
    const tagPattern = /\[(default|painful|happy)\]/g;
    let firstEnd = -1;
    let count = 0;
    let m: RegExpExecArray | null;
    while ((m = tagPattern.exec(text)) !== null) {
      count++;
      if (count === 2) {
        firstEnd = m.index;
        break;
      }
    }
    if (firstEnd > 0) {
      parts = [text.slice(0, firstEnd), text.slice(firstEnd)];
    }
  }

  const parseExpressionAndText = (part: string): { expression: Expression; text: string } => {
    // テキスト内のすべての表情タグを検出（最後のものを採用）
    const expressionPattern = /\[(default|painful|happy)\]/g;

    // exec()でループして全マッチを取得（matchAllの代替）
    let lastExpression: string | null = null;
    let match: RegExpExecArray | null;
    while ((match = expressionPattern.exec(part)) !== null) {
      lastExpression = match[1];
    }

    // 最後に出現したタグを表情として採用（なければdefault）
    const expression = (lastExpression || 'default') as Expression;

    // すべての表情タグをテキストから除去
    const cleanedText = part.replace(/\[(default|painful|happy)\]/g, '').trim();

    return { expression, text: cleanedText };
  };

  const thoughtPart = parseExpressionAndText(parts[0] || '');
  const speechPart = parseExpressionAndText(parts[1] || '');

  return {
    internal_thought: clampDiscussionText(thoughtPart.text, MAX_DISCUSSION_THOUGHT_CHARS),
    internal_expression: thoughtPart.expression,
    external_speech: clampDiscussionText(speechPart.text, MAX_DISCUSSION_SPEECH_CHARS),
    external_expression: speechPart.expression,
  };
};
