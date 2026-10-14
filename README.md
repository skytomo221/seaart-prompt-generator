# Seaart Prompt Generator

## リリース手順

Windows x64向けリリースは、`v*` タグをpushするとGitHub Actionsでビルドされます。NSISインストーラーとTauri Updater用の署名済み成果物が生成され、GitHub Releaseへアップロードされます。

1. `package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` のバージョンを同じ `X.Y.Z` にします。タグと3つのバージョンが一致しない場合、workflowは失敗します。
2. `npm test`、`npm run build`、`cargo test --manifest-path src-tauri/Cargo.toml`、`cargo check --manifest-path src-tauri/Cargo.toml` を実行し、成功することを確認します。
3. リリース変更をコミットします。
4. バージョンに一致する `vX.Y.Z` タグを作成してpushします。例: `git tag v3.0.0`、`git push origin v3.0.0`
5. GitHub ActionsがWindows x64向けNSISインストーラーとUpdater成果物をビルドし、インストーラー、署名ファイル、`latest.json` を含むGitHub Releaseを作成します。

リリース前に、GitHub ActionsのリポジトリSecretへ次の値を手動で登録してください。

- `TAURI_SIGNING_PRIVATE_KEY`

署名鍵はリポジトリ外で安全に保管し、GitHub Actionsでは上記のSecretから利用してください。秘密鍵をリポジトリへコミットしないでください。

署名鍵にパスワードを設定した場合は、`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` もGitHub ActionsのSecretへ登録してください。
