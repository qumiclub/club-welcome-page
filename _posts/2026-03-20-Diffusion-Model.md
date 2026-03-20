---
layout: article
title: Diffusion Model
author: K. Kotaro
tags: []
date: '2026-03-20'
published: false
---
# 拡散モデル (Diffusion Models) の数式と $L_{\text{simple}}$ への導出

この記事では、拡散モデルにおけるELBO（変分下限）の導出から、DDPM (Ho et al., 2020) で提案されたシンプルな損失関数 $L_{\text{simple}}$ に至るまでの数式展開をまとめます。

---

## 1. 前提：順伝播と逆伝播の定式化

拡散モデルは、データにノイズを加えていく**順伝播（Forward process）**と、ノイズを除去していく**逆伝播（Reverse process）**から成ります。

### 順伝播 (Forward Process)
データ $\mathbf{x}_0$ に対して、ステップ $t$ ごとに微小なガウシアンノイズを加えていきます。

$$q(\mathbf{x}_t | \mathbf{x}_{t-1}) = \mathcal{N}\left(\mathbf{x}_t; \sqrt{1-\beta_t}\mathbf{x}_{t-1}, \beta_t\mathbf{I}\right)$$



### 逆伝播 (Reverse Process)
学習可能なパラメータ $\boldsymbol{\theta}$ を持つニューラルネットワークを用いて、一つ前のステップの状態を予測します。

$$p_{\boldsymbol{\theta}}(\mathbf{x}_{t-1} | \mathbf{x}_t) = \mathcal{N}\left(\mathbf{x}_{t-1}; \boldsymbol{\mu}_{\boldsymbol{\theta}}(\mathbf{x}_t, t), \boldsymbol{\Sigma}_{\boldsymbol{\theta}}(\mathbf{x}_t, t)\right)$$



---

## 2. ELBO（変分下限）の導出

VAEと同様に、データ $\mathbf{x}_0$ の対数尤度 $\log p(\mathbf{x}_0)$ を最大化することを考えますが、直接計算は困難なため、ELBO（Evidence Lower Bound）を最大化（＝負のELBOを最小化）します。

$$
\begin{aligned}
\log p(\mathbf{x}_0) &\ge \mathbb{E}_{q(\mathbf{x}_{1:T}|\mathbf{x}_0)} \left[ \log \dfrac{p_{\boldsymbol{\theta}}(\mathbf{x}_{0:T})}{q(\mathbf{x}_{1:T}|\mathbf{x}_0)} \right] \\
&= -L_{\text{VLB}}
\end{aligned}
$$



---

## 3. 損失関数のKLダイバージェンスへの分解

負のELBOである $L_{\text{VLB}}$ は、ベイズの定理とマルコフ性を利用して式変形することで、3つの項（$L_T$, $L_{t-1}$, $L_0$）に分解できます。ここで重要になるのが、2つの分布の近さを測るKLダイバージェンス $D_{\text{KL}}$ です。

$$L_{\text{VLB}} = L_T + \displaystyle \sum_{t=2}^T L_{t-1} + L_0$$



中でも、モデルの学習に直接関わるメインの損失項 $L_{t-1}$ は次のように表されます。

$$L_{t-1} = D_{\text{KL}}\left( q(\mathbf{x}_{t-1}|\mathbf{x}_t, \mathbf{x}_0) \parallel p_{\boldsymbol{\theta}}(\mathbf{x}_{t-1}|\mathbf{x}_t) \right)$$



---

## 4. ガウス分布のKLダイバージェンスとノイズ予測への変換

$q$ も $p_{\boldsymbol{\theta}}$ もガウス分布であるため、KLダイバージェンスは「2つの分布の平均ベクトルの二乗誤差」として計算できます。

$$L_{t-1} = \mathbb{E}_q \left[ \dfrac{1}{2\sigma_t^2} \left\| \tilde{\boldsymbol{\mu}}_t(\mathbf{x}_t, \mathbf{x}_0) - \boldsymbol{\mu}_{\boldsymbol{\theta}}(\mathbf{x}_t, t) \right\|^2 \right] + C$$



ここで、ニューラルネットワークに「平均 $\boldsymbol{\mu}_{\boldsymbol{\theta}}$」を直接予測させるのではなく、「加えたノイズ $\boldsymbol{\epsilon}_{\boldsymbol{\theta}}$」を予測させるようにパラメータを再定式化します。

$$\boldsymbol{\mu}_{\boldsymbol{\theta}}(\mathbf{x}_t, t) = \dfrac{1}{\sqrt{\alpha_t}} \left( \mathbf{x}_t - \dfrac{\beta_t}{\sqrt{1-\bar{\alpha}_t}} \boldsymbol{\epsilon}_{\boldsymbol{\theta}}(\mathbf{x}_t, t) \right)$$



これを損失関数に代入すると、目的関数はノイズ $\boldsymbol{\epsilon}$ の二乗誤差関数の形になります。

$$L_{t-1} = \mathbb{E}_{\mathbf{x}_0, \boldsymbol{\epsilon}} \left[ \dfrac{\beta_t^2}{2\sigma_t^2 \alpha_t (1-\bar{\alpha}_t)} \left\| \boldsymbol{\epsilon} - \boldsymbol{\epsilon}_{\boldsymbol{\theta}}(\mathbf{x}_t, t) \right\|^2 \right]$$



---

## 5. DDPMにおける簡略化（$L_{\text{simple}}$）

DDPMの論文 (Ho et al., 2020) の大発見は、上記の式についている複雑な係数 $\dfrac{\beta_t^2}{2\sigma_t^2 \alpha_t (1-\bar{\alpha}_t)}$ を**すべて無視して1にしてしまう（重み付けを外す）**ことで、生成される画像の品質が逆に向上することを示した点です。

最終的に、拡散モデルで実際に最適化される非常にシンプルな損失関数 $L_{\text{simple}}$ が導かれます。

$$L_{\text{simple}} = \mathbb{E}_{t, \mathbf{x}_0, \boldsymbol{\epsilon}} \left[ \left\| \boldsymbol{\epsilon} - \boldsymbol{\epsilon}_{\boldsymbol{\theta}}(\mathbf{x}_t, t) \right\|^2 \right]$$

---

## 6. 条件付き拡散モデル（Stable Diffusionなど）の損失関数

DDPMの成功を受け、プロンプト（テキスト）などの指示に従って画像を生成できるように発展したのが、Stable Diffusionに代表される**条件付き拡散モデル**です。

### 潜在拡散モデル (Latent Diffusion Models: LDM)
Stable Diffusionでは、計算効率を上げるためにピクセル空間 $\mathbf{x}$ ではなく、エンコーダによって圧縮された**潜在空間（Latent space）** $\mathbf{z}$ の上で拡散過程を行います。

さらに、テキストプロンプトなどの条件をエンコーダ（CLIPなど）で特徴ベクトル $\mathbf{c}$ に変換し、ノイズ予測ネットワーク $\boldsymbol{\epsilon}_{\boldsymbol{\theta}}$ に入力として与えます。これにより、「テキスト条件 $\mathbf{c}$ に従ったノイズ除去」を学習させます。

最終的なStable Diffusion（LDM）の損失関数は、DDPMの $L_{\text{simple}}$ を拡張した以下の形になります。

$$L_{\text{LDM}} = \mathbb{E}_{\mathbf{z}_0, t, \mathbf{c}, \boldsymbol{\epsilon}} \left[ \left\| \boldsymbol{\epsilon} - \boldsymbol{\epsilon}_{\boldsymbol{\theta}}(\mathbf{z}_t, t, \mathbf{c}) \right\|^2 \right]$$



**式の意味：**
* $\mathbf{z}_0$: エンコーダで圧縮された潜在表現（元画像）
* $\mathbf{z}_t$: ステップ $t$ におけるノイズが付加された潜在表現
* $\mathbf{c}$: テキストプロンプトなどをエンコードした条件ベクトル（Condition）
* $\boldsymbol{\epsilon}_{\boldsymbol{\theta}}(\mathbf{z}_t, t, \mathbf{c})$: ステップ数 $t$ と条件 $\mathbf{c}$ をヒントに、ニューラルネットワーク（U-Netなど）が予測したノイズ

このように、基本となる $L_{\text{simple}}$ の入力に $\mathbf{c}$ を追加し、計算空間を $\mathbf{x}$ から $\mathbf{z}$ に移すだけで、あの強力なテキストからの画像生成モデルの学習式が完成します。
