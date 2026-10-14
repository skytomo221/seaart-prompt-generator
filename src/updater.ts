import { check, type Update } from "@tauri-apps/plugin-updater";

export type AvailableUpdate = Pick<
  Update,
  "version" | "downloadAndInstall" | "close"
>;

export function checkForUpdates(): Promise<Update | null> {
  return check();
}

export function installUpdate(update: AvailableUpdate): Promise<void> {
  return update.downloadAndInstall();
}
