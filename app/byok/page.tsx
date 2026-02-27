'use client';

/**
 * BYOK（Bring Your Own Key）ページ
 *
 * ユーザー自身のGemini APIキーを入力・検証し、入場待機なしで
 * ゲームに直接入場するためのページ。
 *
 * フロー:
 *   1. APIキー入力 → 「確認」で Gemini REST API に generateContent を送信して検証
 *   2. 検証成功 → sessionStorage にキーを保存 → 「入場」ボタンが有効化
 *   3. 「入場」→ /game?byok=1 に遷移（/wait をスキップ）
 *
 * セキュリティ:
 *   - キーはブラウザから直接 Gemini API へ送信（サーバーを経由しない）
 *   - sessionStorage に保存（タブを閉じると消去される）
 *   - サーバーサイドへの保存・ログ出力は一切行わない
 *
 * @see docs/20260218_byok_support.md 仕様ドキュメント
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/** sessionStorage のキー名 */
const BYOK_STORAGE_KEY = 'dg_byok_api_key';

/** 検証用エンドポイント（Gemini REST API） — ゲーム本番で使うモデルと合わせる */
const GEMINI_VALIDATE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/** 検証状態 */
type ValidationStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Gemini APIキーの有効性をクライアントサイドで検証する
 *
 * 軽量な generateContent リクエストを送信し、レスポンスのステータスコードで判定。
 * サーバーを経由せず、ブラウザから直接 Gemini API を呼ぶ。
 *
 * @param apiKey - 検証対象のGemini APIキー（`AIza...` 形式）
 * @returns ok: true なら検証成功、false ならエラーメッセージ付き
 */
async function validateGeminiApiKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    // x-goog-api-key ヘッダーで認証（URL にキーを露出させない）
    const res = await fetch(GEMINI_VALIDATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'ping' }] }],
      }),
    });

    if (res.ok) return { ok: true };

    if (res.status === 400) return { ok: false, error: 'APIキーの形式が不正です' };
    if (res.status === 403) return { ok: false, error: 'APIキーが無効、または権限がありません' };
    if (res.status === 429) return { ok: false, error: 'レート制限中です。しばらくお待ちください' };

    try {
      const data = await res.json();
      return { ok: false, error: data?.error?.message ?? `エラー (${res.status})` };
    } catch {
      return { ok: false, error: `エラー (${res.status})` };
    }
  } catch {
    return { ok: false, error: 'ネットワークエラーが発生しました' };
  }
}

export default function ByokPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<ValidationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // sessionStorage に有効なキーが残っていれば復元（再入力不要にする）
  useEffect(() => {
    try {
      const encoded = sessionStorage.getItem(BYOK_STORAGE_KEY);
      const tsStr = sessionStorage.getItem(BYOK_STORAGE_KEY + '_ts');
      if (!encoded || !tsStr) return;

      const BYOK_TTL_MS = 30 * 60 * 1000;
      if (Date.now() - Number(tsStr) > BYOK_TTL_MS) {
        sessionStorage.removeItem(BYOK_STORAGE_KEY);
        sessionStorage.removeItem(BYOK_STORAGE_KEY + '_ts');
        return;
      }

      const decoded = atob(encoded);
      if (decoded) {
        setApiKey(decoded);
        setStatus('success');
      }
    } catch {
      // デコード失敗等は無視して空欄スタート
    }
  }, []);

  const handleValidate = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) return;

    setStatus('loading');
    setErrorMessage('');

    const result = await validateGeminiApiKey(trimmed);

    if (result.ok) {
      setStatus('success');
      // Base64 エンコードして保存（平文での露出を避ける最低限の難読化）
      sessionStorage.setItem(BYOK_STORAGE_KEY, btoa(trimmed));
      // 最終利用タイムスタンプ（30分無操作で自動失効させるため）
      sessionStorage.setItem(BYOK_STORAGE_KEY + '_ts', String(Date.now()));
    } else {
      setStatus('error');
      setErrorMessage(result.error ?? 'Unknown error');
    }
  };

  const handleEnter = () => {
    router.push('/game');
  };

  const isValidated = status === 'success';

  return (
    <div className="min-h-dvh relative bg-[#050505]">
      {/* CRTオーバーレイ */}
      <div className="fixed inset-0 z-50 pointer-events-none crt-overlay opacity-30" />
      <div className="fixed inset-0 z-40 pointer-events-none bg-green-500/[0.02] mix-blend-overlay" />

      <div className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* ターミナルボックス */}
          <div className="border-2 border-[#33ff00] bg-[#061206] p-6 shadow-[0_0_15px_rgba(51,255,0,0.2)]">
            {/* ヘッダー */}
            <div className="mb-6">
              <p className="text-xs text-[#33ff00]/60 mb-1">&gt; SYSTEM://AUTH</p>
              <h1 className="text-lg text-[#33ff00] font-bold">
                API KEY AUTHENTICATION<span className="animate-pulse">_</span>
              </h1>
            </div>

            {/* 説明文 */}
            <div className="text-sm text-[#6eb659] mb-4 leading-relaxed space-y-1.5">
              <p>
                Gemini APIキーを入力してください。
                <br />
                待機なし・回数無制限でプレイできます。
              </p>
              <p className="text-xs text-[#6eb659]/70">
                キーはサーバーに送信されず、ブラウザからGoogleに直接通信します。
              </p>
            </div>
            <Link
              href="/byok/guide"
              className="mb-6 block text-xs text-[#33ff00]/70 underline hover:text-[#33ff00] transition-colors"
            >
              APIキーとは？取得方法・セキュリティの詳細 →
            </Link>

            {/* APIキー入力フィールド */}
            <div className="mb-4">
              <label className="block text-xs text-[#33ff00]/70 mb-2">
                &gt; API_KEY:
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  if (status !== 'idle' && status !== 'loading') {
                    setStatus('idle');
                    setErrorMessage('');
                  }
                }}
                placeholder="AIza..."
                className="w-full bg-[#020802] border border-[#33ff00]/40 px-3 py-2.5 text-sm text-[#33ff00] placeholder-[#33ff00]/25 outline-none focus:border-[#33ff00] focus:shadow-[0_0_8px_rgba(51,255,0,0.3)] transition"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && apiKey.trim()) handleValidate();
                }}
              />
            </div>

            {/* 確認ボタン */}
            <button
              onClick={handleValidate}
              disabled={!apiKey.trim() || status === 'loading'}
              className="w-full border border-[#33ff00]/60 bg-[#0a1f0a] px-4 py-2.5 text-sm text-[#33ff00] transition hover:bg-[#33ff00]/15 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'VERIFYING...' : '確認'}
            </button>

            {/* 検証結果表示 */}
            {status === 'success' && (
              <div className="mt-4 border border-[#33ff00]/40 bg-[#001a00] px-3 py-2 text-sm text-[#33ff00]">
                AUTHENTICATED - キーが確認されました
              </div>
            )}
            {status === 'error' && (
              <div className="mt-4 border border-[#ff4d6d]/40 bg-[#1a0008] px-3 py-2 text-sm text-[#ff4d6d]">
                AUTHENTICATION FAILED - {errorMessage}
              </div>
            )}

            {/* 区切り線 */}
            <div className="my-6 border-t border-[#33ff00]/20" />

            {/* 入場ボタン（検証成功後に有効化） */}
            <button
              onClick={handleEnter}
              disabled={!isValidated}
              className={`w-full border-2 px-4 py-3 text-base font-bold transition ${
                isValidated
                  ? 'border-[#33ff00] bg-[#061206] text-[#33ff00] hover:bg-[#33ff00]/15'
                  : 'border-[#33ff00]/20 bg-[#061206] text-[#33ff00]/20 cursor-not-allowed'
              }`}
            >
              入場
            </button>

            {/* トップへ戻るリンク */}
            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-xs text-[#6eb659]/70 underline hover:text-[#33ff00] transition"
              >
                &lt; トップページに戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
