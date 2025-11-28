---
layout: article
title: RustでPythonと連携する
author: N.Haruto
tags:
  - Rust
  - Python
date: '2025-11-28'
---
## はじめに

近年、Rustは**高速で安全なシステムプログラミング言語**として注目を集めています。一方、AIやデータ処理の分野ではPythonが圧倒的な存在感を持ちます。
この記事では、Rustの利点や開発環境、さらにPythonと連携する方法を初心者向けに解説します。

---

## 1. Rustとは？

Rustは以下の特徴を持つ言語です：

* **安全性**

  * メモリ管理をコンパイラがチェックするため、Segmentation Faultやデータ競合を防止
* **高速性**

  * C/C++と同等の性能で、ゼロコスト抽象化を実現
  * Ruffもuvもrust製
* **並列処理が得意**

  * 安全な並列処理を簡単に書ける
* **バイナリ単体で配布可能**

  * Pythonのように仮想環境や依存関係を気にせず配布できる
  * 簡単なアプリを作成して配布する場合は有用

Rustはシステム開発だけでなく、CLIツールやWebバックエンド、さらにはAI推論の高速化にも向いています。

---

## 2. Rustの開発環境

### 2.1 WSL / Docker の選択

* **WSL**

  * Windows環境でRustをネイティブに動かす
  * VSCodeと相性が良く、開発効率が高い

> 多くのケースでは WSL 上で Rust 開発 → リリース時にバイナリ化 という流れが最も現実的

### 2.2 VSCodeとの統合

* **拡張機能**

  * Rust (rust-analyzer)
  * CodeLLDB（デバッグ用）
* **自動フォーマット / lint**

  * 保存時に `rustfmt` で整形
  * `clippy` で警告・改善点を表示

---

## 3. Pythonとの連携の必要性

Rustは高速で安全ですが、AIやデータ処理のライブラリはPythonの方が豊富です。

* **AIモデルの推論や学習** → PyTorch / TensorFlow / HuggingFace
* **データ処理・解析** → pandas / numpy / scikit-learn

Rustで処理できる部分はRust、AI部分だけPythonを呼び出す設計が現実的です。

---

## 4. RustとPythonを連携する方法

1. **Python側でAPIを用意**

   * FastAPIやFlaskなどでREST APIを作成
2. **RustからHTTPリクエストで呼び出す**

   * `reqwest` や `ureq` などのHTTPクライアントを使用
3. **JSONで入出力を統一**

   * RustとPythonの間でデータ形式を固定することで互換性を維持

> Rust単体でもAPIで動く構造にしておくと、将来的にある処理でAIを使おうと思ったときにPythonを入れることが可能です。

> Rust単体でも推論ならOnnx runtime等でAIの活用が可能

#### 例：Rust側

```rust
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct RequestData {
    input: String,
}

#[derive(Deserialize)]
struct ResponseData {
    result: String,
}

fn call_python_api() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();
    let req = RequestData { input: "Hello".into() };
    let resp: ResponseData = client.post("http://127.0.0.1:8000/run")
        .json(&req)
        .send()?
        .json()?;
    println!("Pythonからの結果: {}", resp.result);
    Ok(())
}
```
---

## 5. Rustを主体にする設計の利点

* **高速で安全な処理を担保**
* **UIや設定処理をRustで統一**
* **PythonはAI部分だけ**
* **将来的にPythonをRustに置き換えやすい**
* **設定ファイルはYAMLで、APIはJSONで統一すると互換性を維持しやすい**

---

## 6. まとめ

* Rustは**高速・安全・配布が容易**な言語
* Pythonは**AI・データ処理に強いエコシステム**を持つ
* RustとPythonを連携することで、両言語の強みを最大限活かせる
* API形式で連携する設計を取ると、**互換性と将来性を確保**できる
