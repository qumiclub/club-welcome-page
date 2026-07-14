---
layout: article
title: スマホからClaude Codeへの遠隔アクセス設計
author: N.Haruto
tags:
  - wsl
  - 開発環境
  - ADE
  - ssh
date: '2026-07-14'
published: false
---
# スマホからClaude Codeへの遠隔アクセス設計

## 背景・目的

PCメインで作業しているが、Claude Codeの利用が増え、外出中でも許可応答(permission)や新規指示をスマホから出したい。特にPC上で既に起動しているClaude Codeセッションに、外出先からそのまま復帰したい。

開発環境はWindows専用ライブラリがあるためWindowsネイティブの`.venv`(uv管理, Windows版Python 3.11)のみが存在し、WSLからは`/mnt/c/.../.venv/Scripts/python.exe`をinterop経由で直接呼び出すことで、Linux/Windows問わず同じ依存一式が使える。

## アーキテクチャ

```
[PC/WSL] Claude Codeが停止(permission待ち等)
   → Notification hook がntfyへpush送信
[スマホ] ntfy通知を受信 → タップでAndroidインテント com.claude.CONNECT を発火
   → MacroDroidが受信 → Termuxへ RUN_COMMAND で接続スクリプトを実行指示
[スマホ] Termux → Tailscale経由でWSLのsshdへssh → tmux attach
   → 生きていたClaude Codeセッションにそのまま着地、返信・指示を入力
[WSL] Claude Codeがコマンド実行時は必ずWindows側venv(interop)を叩く
   → ゲーム操作/デバイス入力を含む処理もそのまま動く
```

## コンポーネント

| # | コンポーネント | 役割 |
|---|---|---|
| 1 | WSL2 mirrored networking | WSLがWindowsのTailscale IPをそのまま共有 |
| 2 | WSL内 sshd (systemd常駐) | スマホからの入口。鍵認証のみ、パスワードなし |
| 3 | tmux永続セッション | Claude Codeを起動しっぱなしにする器 |
| 4 | PATHシム (`.bashrc`) | `python`/`python3` を Windows venv の `python.exe` に固定 |
| 5 | CLAUDE.md追記 | Windows専用依存の理由を明文化(なぜPATHがこうなっているか、Claude Codeが誤って"直そう"としないためのガード) |
| 6 | Claude Code Notification hook | 停止イベントをntfyへpush(汎用メッセージのみ、プロンプト内容は含めない) |
| 7 | ntfyアプリ設定(スマホ) | ランダムなtopic名を購読、タップでintent発火 |
| 8 | MacroDroidマクロ | intent(`com.claude.CONNECT`)受信→TermuxへRUN_COMMAND |
| 9 | Termux接続スクリプト | `ssh <tailscale-host> -t 'tmux attach -t work \|\| tmux new -s work'` |
| 10 | Tailscale | PC・スマホ間のネットワーク経路 |
