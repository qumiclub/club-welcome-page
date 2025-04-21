---
layout: article
title: "SSHで複数のGitHubアカウントを使い分ける方法"
author: N.Haruto
tags: ["GitHub", "開発環境"]
---
# SSHで複数のGitHubアカウントを使い分ける方法

## はじめに

個人アカウントと組織用アカウントなど、複数のGitHubアカウントを使い分けたい場面は、開発をしていると意外と多くあります（あるかな？）。  
- 学生で個人用のアカウントと、研究室やサークル用のアカウントがある
- 本業と副業で使い分けている
- 組織のGitHub Enterpriseと個人GitHubの両方を使う必要がある

こうした状況では、**1台のPCで複数アカウントをうまく切り替える方法**が必要になります。

---

### 「HTTPSでもできるのでは？」という疑問について

HTTPSを使ってPersonal Access Token（PAT）やCredential Managerでアカウントを切り替えることも**技術的には可能**です。ですが、実際に運用してみると以下のようなデメリットがあります：

- トークンの再発行や期限管理がやや面倒（90日ごとに期限切れ問題など）
- キャッシュがうまく機能せず、再認証が必要になることがある
- どのリポジトリがどのアカウントでアクセスされるのか、直感的に分かりづらい
- 特に複数の組織に関わる場合、GUIツールやCLIでの挙動が混乱しがち

---

### SSHのメリット

その点、**SSH方式では「どの鍵を使ってどのアカウントに接続するか」**を設定ファイルで明示的に切り分けられるため、**一度設定すれば安定して切り替えが可能**です。GitのリモートURLに `git@github-work:` のように書くだけで、対応するアカウントが選ばれます。

特に以下のような人にとって、SSHは非常に有効です：

- 長期的に複数アカウントを使い続ける予定のある人
- ターミナル中心の開発をしている人
- 設定ファイルを使って環境構築を自動化したい人（dotfiles運用など）

今回は、SSHキーと設定ファイル（`config`）を活用して、**複数のGitHubアカウントを快適に切り替えられるようにする方法**を紹介していきます。

## 前提条件

- Gitがインストールされている
- SSHが使える環境（Windows, macOS, Linuxいずれも可）
- GitHubアカウントを2つ以上持っている

※今回はターミナル（コマンドライン）操作が中心です。

---

## ステップ1：SSH鍵の作成

アカウントごとに異なるSSH鍵を作成します。

### 1つ目（例：個人アカウント）

```bash
ssh-keygen -t ed25519 -C "your_personal_email@example.com"
# 保存先: ~/.ssh/id_ed25519_github_personal
```

### 2つ目（例：仕事用アカウント）

```bash
ssh-keygen -t ed25519 -C "your_work_email@example.com"
# 保存先: ~/.ssh/id_ed25519_github_work
```

※Windowsの場合、`~/.ssh/` は「C:/Users/ユーザー名/.ssh」にあります。

---

## ステップ2：GitHubにSSH公開鍵を登録

各アカウントのGitHubページにログインし、「Settings > SSH and GPG keys」から、対応する `.pub` ファイルの中身を貼り付けて登録します。

---

## ステップ3：SSHの設定ファイルを作成・編集する

SSHの設定ファイル `config` を編集します。これは「ホームディレクトリにある `.ssh` フォルダの中」にある `config` という名前のファイルです。

もしなければ新しく作ってOKです。

```bash
# ターミナルで開く例（macOS/Linux）
nano ~/.ssh/config
```

```plaintext
Host github-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github_personal

Host github-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github_work
```

**補足：**
- `Host` は任意の名前でOK（後ほどGitのURLに使います）
- `IdentityFile` は先ほど作成した鍵のパスを指定します

---

## ステップ4：Gitリポジトリに応じた接続先の設定

### 個人用のリポジトリをクローンするとき：

```bash
git clone git@github-personal:your-username/your-repo.git
```

### 仕事用のリポジトリをクローンするとき：

```bash
git clone git@github-work:your-org/your-repo.git
```

すでにクローン済みのリポジトリなら、以下でリモートURLを変更できます：

```bash
git remote set-url origin git@github-personal:your-username/your-repo.git
```

---

## ステップ5：動作確認

```bash
ssh -T git@github-personal
# → 個人アカウントの名前で認証されればOK

ssh -T git@github-work
# → 仕事用アカウントで認証されればOK
```

---

## Q&A

### Q. SSHでアカウントを切り替えたのに、GitHub上の表示が意図したアカウントになりません！

**A. `git config` の `user.name` と `user.email` が適切に設定されていない可能性があります。**

SSHキーを使うことでGitHubへの**接続**は切り替わりますが、**コミットに紐づく「誰が変更したか」という情報は別**です。

Gitは、各コミットごとに `user.name` と `user.email` を記録しています。そしてGitHubは、コミットの `email` がそのアカウントに登録されているかを見て、アカウントと紐づけています。

#### 解決策

それぞれのリポジトリで以下を設定しましょう：

```bash
git config user.name "Your Work Name"
git config user.email "your@work-email.com"
```

> この設定は、リポジトリの `.git/config` に保存されます。グローバル設定（`--global`）は全プロジェクトに反映されるので、複数アカウントがある場合は避けた方が無難です。

#### 例：意図しないアカウントでコミットしてしまった場合

- GitHub上に表示されるアバターが個人用のままになる  
- コミット履歴が別アカウントに紐づかない  
- 組織の活動ログに表示されない
