# Contributing

This game was originally hosted on GCP, but running costs got too high — so we open-sourced it so everyone can run it in their own environment. **Forking is strongly encouraged.** Take it, remix it, make it yours.

We're a tiny team and won't be actively maintaining this, so PRs may go unreviewed. If you find a critical bug, Issues are welcome — we'll do our best.

もともとGCPでホストしていましたが、運用コストが厳しくなったためOSS化しました。皆さんの環境で自由に遊んでもらえたら嬉しいです。**フォーク大歓迎です。** 好きなように改造してください。

少人数で運営しており積極的なメンテナンスは難しいため、PRへの対応はお約束できません。重大なバグはIssueで報告いただければ、できる範囲で対応します。

## Issues

- Bug reports and feature suggestions via [GitHub Issues](https://github.com/yami-inc/ai-death-game/issues)
- **Never include your API key in issues**

## Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Open a pull request

### Notes

- This project targets Gemini API only. Other LLM providers are out of scope
- Discuss large changes in an Issue before submitting a PR

## Development

```bash
git clone https://github.com/yami-inc/ai-death-game.git
cd ai-death-game
npm install
npm run dev
```

## Coding Conventions

- TypeScript
- Comments in Japanese
- Styling with Tailwind CSS
- Components in `components/`
