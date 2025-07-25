# SeaArt プロンプトジェネレーター

SeaArt プロンプトジェネレーターは、アート生成やストーリーテリングなど、さまざまな用途において創造的で魅力的なプロンプトを作成するためのツールです。

## 特徴

- ユーザー入力に基づいたユニークなプロンプトを生成。
- 特定のニーズに合わせてプロンプトのパラメータをカスタマイズ可能。
- 簡単に使えるインターフェースで迅速なプロンプト生成を実現。

## 使用方法

ブラウザで`index.html`を開いて、プロンプトジェネレーターを使用できます。

data.js ファイルを編集して、プロンプトのテンプレートやパラメータをカスタマイズすることも可能です。
data.js は以下のような構造になっています。

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PromptData",
  "type": "object",
  "properties": {
    "characterTypeName": {
      "type": "string"
    },
    "keywords": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "type", "prompt"],
        "properties": {
          "name": {
            "type": "string"
          },
          "type": {
            "type": "string"
          },
          "prompt": {
            "type": "string"
          },
          "negativePrompt": {
            "type": "string"
          }
        },
        "additionalProperties": false
      }
    },
    "defaults": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["character", "parts"],
        "properties": {
          "character": {
            "type": "string"
          },
          "parts": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["type", "prompt"],
              "properties": {
                "type": {
                  "type": "string"
                },
                "prompt": {
                  "type": "string"
                }
              },
              "additionalProperties": false
            }
          }
        },
        "additionalProperties": false
      }
    }
  },
  "required": ["characterTypeName", "keywords", "defaults"],
  "additionalProperties": false
}
```

## ライセンス

このプロジェクトは [MIT ライセンス](LICENSE) の下でライセンスされています。

## お問い合わせ

質問やフィードバックについては、 skytomo221 までご連絡ください。
