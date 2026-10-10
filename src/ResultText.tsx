import { Button, ControlGroup, InputGroup, Intent } from "@blueprintjs/core";
import { appToaster } from "./toaster";

interface ResultTextProps { text: string; }

export default function ResultText({ text }: ResultTextProps) {
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      const toaster = await appToaster;
      toaster.show({ message: "クリップボードにコピーしました！", intent: Intent.SUCCESS, timeout: 3000 });
    } catch (error) {
      const toaster = await appToaster;
      toaster.show({ message: `コピーに失敗しました: ${String(error)}`, intent: Intent.DANGER, timeout: 3000 });
    }
  };
  return <ControlGroup fill className="result-text">
    <InputGroup value={text} readOnly fill aria-label="result text" />
    <Button icon="clipboard" size="small" aria-label="copy to clipboard" onClick={handleCopyToClipboard} />
  </ControlGroup>;
}
