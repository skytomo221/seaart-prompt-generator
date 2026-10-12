import { Button, ControlGroup, InputGroup, Intent } from "@blueprintjs/core";
import {
  createContext,
  useContext,
  useId,
  useState,
  type ReactNode,
} from "react";
import { appToaster } from "./toaster";

type CopiedResult = { id: string; text: string } | null;

interface ResultCopyStatusContextValue {
  copied: CopiedResult;
  markCopied: (id: string, text: string) => void;
}

const ResultCopyStatusContext =
  createContext<ResultCopyStatusContextValue | null>(null);

export function ResultCopyStatusProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [copied, setCopied] = useState<CopiedResult>(null);

  return (
    <ResultCopyStatusContext.Provider
      value={{ copied, markCopied: (id, text) => setCopied({ id, text }) }}
    >
      {children}
    </ResultCopyStatusContext.Provider>
  );
}

interface ResultTextProps {
  text: string;
}

export default function ResultText({ text }: ResultTextProps) {
  const id = useId();
  const copyStatus = useContext(ResultCopyStatusContext);
  const isCopied =
    copyStatus?.copied?.id === id && copyStatus.copied.text === text;

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      copyStatus?.markCopied(id, text);
      const toaster = await appToaster;
      toaster.show({
        message: "クリップボードにコピーしました！",
        intent: Intent.SUCCESS,
        timeout: 3000,
      });
    } catch (error) {
      const toaster = await appToaster;
      toaster.show({
        message: `コピーに失敗しました: ${String(error)}`,
        intent: Intent.DANGER,
        timeout: 3000,
      });
    }
  };
  return (
    <ControlGroup fill className="result-text">
      <InputGroup value={text} readOnly fill aria-label="result text" />
      <Button
        icon={isCopied ? "tick" : "clipboard"}
        size="small"
        aria-label={isCopied ? "copied to clipboard" : "copy to clipboard"}
        onClick={handleCopyToClipboard}
      />
    </ControlGroup>
  );
}
