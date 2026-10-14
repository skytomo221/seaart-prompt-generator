import { Button, Dialog } from "@blueprintjs/core";
import { useEffect, useRef, useState } from "react";
import { appToaster } from "./toaster";
import {
  checkForUpdates,
  installUpdate,
  type AvailableUpdate,
} from "./updater";

export default function UpdateChecker() {
  const started = useRef(false);
  const installLock = useRef(false);
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void checkForUpdates()
      .then(setUpdate)
      .catch((error: unknown) => {
        // An unavailable update endpoint must not interfere with normal startup.
        console.debug("Update check failed", error);
      });
  }, []);

  const dismiss = () => {
    const currentUpdate = update;
    setUpdate(null);
    if (currentUpdate) {
      void currentUpdate.close().catch((error: unknown) => {
        console.debug("Could not release update metadata", error);
      });
    }
  };

  const install = async () => {
    if (!update || installLock.current) return;
    installLock.current = true;
    setInstalling(true);
    try {
      await installUpdate(update);
      setUpdate(null);
    } catch {
      const toaster = await appToaster;
      toaster.show({
        message: "アップデートに失敗しました。",
        intent: "danger",
      });
      installLock.current = false;
      setInstalling(false);
    }
  };

  return (
    <Dialog
      isOpen={update !== null}
      onClose={dismiss}
      title="アップデートがあります"
      isCloseButtonShown={!installing}
      canEscapeKeyClose={!installing}
      canOutsideClickClose={!installing}
      transitionDuration={0}
    >
      {update && <p>バージョン {update.version} が利用できます。</p>}
      <div className="bp6-dialog-footer">
        <div className="bp6-dialog-footer-actions">
          <Button onClick={dismiss} disabled={installing}>
            後で
          </Button>
          <Button
            intent="primary"
            onClick={() => void install()}
            disabled={installing}
          >
            アップデート
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
