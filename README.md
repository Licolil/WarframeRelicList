# Warframe Relic List

Warframe の Void Relic を逆引きするための一覧ツールです。欲しい装備を選ぶと、
そのパーツをドロップするレリックを、レアリティと Vault 状態つきで確認できます。

公開サイトは静的ファイル（`index.html` + `js/`, `css/`, `data/`）として配信されます。

## データソースとクレジット

このプロジェクトはゲーム本体をスクレイピングしません。構造化データはすべて、
コミュニティが管理している次のデータセットから派生しています。

- **[WFCD/warframe-items](https://github.com/WFCD/warframe-items)** - MIT
  License, Copyright (c) 2017 Kaptard. ライセンス全文は
  [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) を参照してください。

上流 JSON をこのサイト用のコンパクトな形式へ変換する処理は
[`js/data-builder.mjs`](js/data-builder.mjs) にあります。この処理は、ビルド時の
スクリプトとブラウザ側の更新ボタンで共有されています。

### 実行時データの取得方法

"Refresh data" ボタンは、**[jsDelivr](https://www.jsdelivr.com/)** 経由で
`WFCD/warframe-items@master` の最新データを取得します。これにより、新しいレリック情報や
Vault 状態の変更が上流に反映されたとき、このリポジトリの更新を待たずにユーザーが最新情報を取得できます。
実際の反映タイミングは jsDelivr の CDN キャッシュに依存します。

実行時に可変ブランチを参照するため、取得したデータはアプリ側で軽量なスキーマ検証、件数制限、
文字列長制限、画像ファイル名の許可リスト検証を通してから利用します。不正なキャッシュや想定外の
データは破棄され、同梱済みの `data/relics.json` にフォールバックします。

### Warframe の商標について

**Warframe** は **Digital Extremes Ltd.** の商標です。このツールは非公式の
ファンツールであり、Digital Extremes との提携、承認、支援を受けたものではありません。
ゲーム内の名称やアセットは、それぞれの権利者に帰属します。

## 同梱データの更新

コミット済みの `data/relics.json` は次のコマンドで再生成します。

```sh
node scripts/fetch-relics.mjs
```

同梱データは初期表示や更新失敗時のフォールバックとして使われます。上流のデータ形式が変わったときや、
初期表示の内容も最新化したいときに再生成してコミットしてください。

## ライセンス

このプロジェクトは [MIT License](LICENSE) のもとで公開されています。同梱している
`data/relics.json` は WFCD/warframe-items の派生物であり、同プロジェクトの MIT
License が適用されます（[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) を参照）。
