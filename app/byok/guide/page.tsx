'use client';

import React from 'react';
import Link from 'next/link';

/**
 * BYOK ガイドページ
 *
 * APIキーとは何か、取得方法、安全性、利用量の説明。
 * ランディングページやBYOK入力ページからリンクされる。
 *
 * デザイン方針: 世界観2割・読みやすさ8割。
 * 背景とアクセントだけゲーム準拠、本文は明るい色で読みやすく。
 */
export default function ByokGuidePage() {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#0a0a0a] text-[#e0e0e0]">
      <div className="mx-auto max-w-xl px-5 py-10 md:py-14">
        {/* ヘッダー */}
        <div className="mb-8">
          <p className="text-xs text-[#33ff00]/50 mb-2 tracking-wider">
            SYSTEM://BYOK_GUIDE
          </p>
          <h1 className="text-2xl font-bold text-white md:text-3xl">
            APIキーで即プレイする方法
          </h1>
          <p className="mt-3 text-sm text-[#999] leading-relaxed">
            Gemini APIキー（無料で取得可）を使えば、待機なしでプレイできます。
            <br />
            このページでは取得方法と安全性について説明します。
          </p>
        </div>

        {/* セクション1: APIキーとは */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-white mb-3">APIキーとは？</h2>
          <div className="text-[15px] leading-[1.8] space-y-3">
            <p>
              APIキーは、GoogleのAIサービス（Gemini）を利用するための「パスワード」のようなものです。
            </p>
            <p>
              通常、このゲームではサーバー側でAIを動かしているため、アクセス集中時に入場制限がかかります。
            </p>
            <p>
              APIキーを使うと、<strong className="text-white">あなたのブラウザから直接GoogleのAIに通信する</strong>ため、サーバー混雑の影響を受けません。
            </p>
          </div>
        </section>

        {/* 重要な注意事項 */}
        <div className="mb-8 rounded-lg bg-[#1a1410] border border-[#3a2a1a] px-5 py-5 text-[15px] leading-[1.8] text-[#bba888]">
          <p className="font-bold text-[#ddc090] mb-3 flex items-center gap-2">
            <span className="text-base">&#9888;</span> ご利用前にご確認ください
          </p>
          <div className="space-y-3">
            <div>
              <p className="font-medium text-[#ddc090] mb-1">年齢制限</p>
              <p>
                Google AI StudioおよびGemini APIキーの取得・利用は<strong className="text-[#ddc090]">18歳以上</strong>の方に限られています（Googleの利用規約による）。
                18歳未満の方は本モードをご利用いただけません。
              </p>
            </div>
            <div>
              <p className="font-medium text-[#ddc090] mb-1">入力データの取り扱い</p>
              <p>
                無料枠（Free Tier）のAPIキーを使用した場合、ゲーム中にAIへ送信されるテキスト等のデータは、GoogleによるAIモデルの改善やサービス向上に利用される可能性があります。
                詳しくは{' '}
                <a
                  href="https://ai.google.dev/gemini-api/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#c0a060] underline hover:text-[#ddc090] transition-colors"
                >
                  Gemini API利用規約
                </a>
                {' '}をご確認ください。
              </p>
            </div>
          </div>
        </div>

        <hr className="border-[#333] mb-8" />

        {/* セクション2: 無料？ */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-white mb-3">料金はかかる？</h2>
          <div className="text-[15px] leading-[1.8] space-y-3">
            <p>
              Googleアカウントがあれば、<strong className="text-white">クレジットカード登録なし</strong>でAPIキーを取得できます。
            </p>
            <p>
              Gemini APIには無料枠があり、現時点では通常のプレイであれば無料枠の範囲内で遊べる見込みです。
            </p>
            <p>
              クレジットカードを登録していない場合、無料枠を超えるとAPIが一時的に使えなくなるだけで、<strong className="text-white">勝手に課金されることはありません</strong>。
              しばらく待てば再び利用できます。
            </p>
            <p className="text-sm text-[#999] mt-1">
              ※ 無料枠の詳細は
              <a
                href="https://ai.google.dev/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5ebbff] underline hover:text-[#8ed0ff] transition-colors"
              >
                Google公式ページ
              </a>
              をご確認ください
            </p>
          </div>
        </section>

        <hr className="border-[#333] mb-8" />

        {/* セクション3: 取得手順 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-white mb-3">APIキーの取得方法</h2>
          <div className="text-[15px] leading-[1.8]">
            <ol className="list-none space-y-4">
              <li className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#33ff00]/10 text-sm font-bold text-[#33ff00]">
                  1
                </span>
                <div className="pt-0.5">
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#5ebbff] underline hover:text-[#8ed0ff] transition-colors"
                  >
                    Google AI Studio
                  </a>
                  {' '}にアクセスし、Googleアカウントでログイン
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#33ff00]/10 text-sm font-bold text-[#33ff00]">
                  2
                </span>
                <span className="pt-0.5">「APIキーを作成」をクリック</span>
              </li>
              <li className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#33ff00]/10 text-sm font-bold text-[#33ff00]">
                  3
                </span>
                <span className="pt-0.5">
                  表示されたキー（<code className="rounded bg-[#222] px-1.5 py-0.5 text-sm text-[#ccc]">AIza...</code> 形式）をコピー
                </span>
              </li>
              <li className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#33ff00]/10 text-sm font-bold text-[#33ff00]">
                  4
                </span>
                <span className="pt-0.5">
                  このサイトの
                  <Link href="/byok" className="text-[#5ebbff] underline hover:text-[#8ed0ff] transition-colors">
                    APIキー入力画面
                  </Link>
                  に貼り付けて「確認」
                </span>
              </li>
            </ol>
          </div>
        </section>

        <hr className="border-[#333] mb-8" />

        {/* セクション4: セキュリティ */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-white mb-3">セキュリティについて</h2>
          <div className="text-[15px] leading-[1.8] space-y-3">
            <p>
              入力されたAPIキーは<strong className="text-white">サーバーに一切送信されません</strong>。
              ブラウザから直接GoogleのAPIに通信します。
            </p>
            <ul className="space-y-2 text-[#ccc]">
              <li className="flex gap-2">
                <span className="shrink-0 text-[#33ff00]">--</span>
                サーバーへの保存・ログ記録は行いません
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-[#33ff00]">--</span>
                キーはブラウザのタブ内にのみ一時保存されます
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-[#33ff00]">--</span>
                タブを閉じると自動的に消去されます
              </li>
            </ul>
            <div className="rounded-lg bg-[#161616] border border-[#2a2a2a] px-4 py-3 mt-3">
              <p className="text-sm text-[#999] leading-relaxed">
                <span className="text-[#bbb] font-medium">確認方法:</span>{' '}
                ブラウザの開発者ツール &gt; Network タブで、通信先が{' '}
                <code className="text-[#ccc]">generativelanguage.googleapis.com</code>{' '}
                のみであることを確認できます。
              </p>
            </div>
            <p className="text-sm text-[#999] mt-2">
              APIキーの取り扱いについては{' '}
              <a
                href="https://ai.google.dev/gemini-api/docs/api-key?hl=ja#security"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5ebbff] underline hover:text-[#8ed0ff] transition-colors"
              >
                Gemini公式のセキュリティガイド
              </a>
              {' '}もあわせてご確認ください。
            </p>
          </div>
        </section>

        <hr className="border-[#333] mb-8" />

        {/* セクション5: 無効化 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-white mb-3">キーを無効化したいとき</h2>
          <div className="text-[15px] leading-[1.8]">
            <p>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5ebbff] underline hover:text-[#8ed0ff] transition-colors"
              >
                Google AI Studio
              </a>
              {' '}でいつでもキーの無効化・再発行ができます。
            </p>
          </div>
        </section>

        <hr className="border-[#333] mb-8" />

        {/* 注意事項 */}
        <section className="mb-10">
          <img
            src="/images/byok/key-caution.jpg"
            alt="ゲーム司会者からのAPIキー取り扱い注意"
            className="w-full rounded-lg mb-10"
          />
          <div className="rounded-lg bg-[#1a1410] border border-[#3a2a1a] px-4 py-4 text-sm leading-[1.8] text-[#bba888]">
            <p className="font-medium text-[#ddc090] mb-2">免責事項</p>
            <p>
              APIキーの取得・管理はご自身の責任で行ってください。
              キーの漏洩や不正利用によって生じた損害について、当サイトは一切の責任を負いかねます。
            </p>
            <p className="mt-2">
              Gemini APIの利用条件や無料枠の内容はGoogleにより変更される場合があります。
              最新の情報は
              <a
                href="https://ai.google.dev/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#c0a060] underline hover:text-[#ddc090] transition-colors"
              >
                Google公式ページ
              </a>
              をご確認ください。
            </p>
          </div>
        </section>

        {/* CTAボタン */}
        <Link
          href="/byok"
          className="block w-full border-2 border-[#33ff00] bg-[#061206] px-4 py-3.5 text-center text-base font-bold text-[#33ff00] transition hover:bg-[#33ff00]/15"
        >
          APIキー入力へ進む
        </Link>

        {/* トップへ戻る */}
        <div className="mt-5 text-center">
          <Link
            href="/"
            className="text-sm text-[#888] underline hover:text-[#ccc] transition"
          >
            &lt; トップページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
