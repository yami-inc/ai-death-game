# コントリビューションガイド

## Issue

- バグ報告・機能提案はGitHub Issuesからお願いします
- **IssueにAPIキーを絶対に含めないでください**

## プルリクエスト

1. リポジトリをフォーク
2. feature branch を作成（`git checkout -b feature/my-feature`）
3. 変更をコミット
4. プルリクエストを作成

### 注意事項

- 本プロジェクトはGemini API専用です。他LLMプロバイダー対応はスコープ外です
- 大きな変更は事前にIssueで議論してください

## 開発環境

```bash
git clone https://github.com/yami-inc/ai-death-game.git
cd ai-death-game
npm install
npm run dev
```

## コーディング規約

- TypeScript
- コメントは日本語
- スタイリングは Tailwind CSS
- コンポーネントは `components/` 配下に配置
