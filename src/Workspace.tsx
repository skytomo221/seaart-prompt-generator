import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Tabs, Tab } from "@blueprintjs/core";
import { Data } from "./data";
import PromptGeneratorsTab from './PromptGeneratorsTab';
import KeywordsTab from './KeywordsTab';
import KeywordTypesTab from './KeywordTypesTab';
import { useKeywordsDispatch, useKeywordsStore } from './contexts/keywordsContext';
import { useKeywordTypesDispatch, useKeywordTypesStore } from './contexts/keywordTypesContext';
import { useDefaultCharactersStore, useDefaultCharactersDispatch } from './contexts/defaultsContext';
import { usePromptGeneratorsStore, usePromptGeneratorsDispatch } from './contexts/promptGeneratorsContext';
import { PromptGenerator } from './promptGenerator';
import { v4 as uuidv4 } from "uuid";

type WorkspaceTabId = "prompt-generators" | "keywords" | "keyword-types";

export default function Workspace() {
  const [value, setValue] = useState<WorkspaceTabId>('prompt-generators');
  const [message, setMessage] = useState("");
  const keywordsDispatch = useKeywordsDispatch();
  const keywordTypesDispatch = useKeywordTypesDispatch();
  const defaultCharactersDispatch = useDefaultCharactersDispatch();
  const keywords = useKeywordsStore();
  const keywordTypes = useKeywordTypesStore();
  const defaultCharacters = useDefaultCharactersStore();
  const promptGenerators = usePromptGeneratorsStore();
  const promptGeneratorsDispatch = usePromptGeneratorsDispatch();

  useEffect(() => {
    invoke("load_configs")
      .then((res) => {
        const { data, prompt_generators: promptGenerators } = res as { data: Data, prompt_generators: PromptGenerator[] };
        keywordsDispatch({ type: "SET_KEYWORDS", payload: data.keywords.map(keyword => ({ ...keyword, id: uuidv4() })) });
        keywordTypesDispatch({ type: "SET_KEYWORD_TYPES", payload: data.keywordTypes });
        defaultCharactersDispatch({ type: "SET_DEFAULT_CHARACTERS", payload: data.defaults });
        if (promptGenerators.length > 0) promptGeneratorsDispatch({ type: "SET_PROMPT_GENERATORS", payload: promptGenerators });
      })
      .catch((err) => setMessage(String(err)));
  }, []);

  const keywordsRef = useRef(keywords);
  const keywordTypesRef = useRef(keywordTypes);
  const defaultCharactersRef = useRef(defaultCharacters);
  const promptGeneratorsRef = useRef(promptGenerators);
  useEffect(() => { keywordsRef.current = keywords; }, [keywords]);
  useEffect(() => { keywordTypesRef.current = keywordTypes; }, [keywordTypes]);
  useEffect(() => { defaultCharactersRef.current = defaultCharacters; }, [defaultCharacters]);
  useEffect(() => { promptGeneratorsRef.current = promptGenerators; }, [promptGenerators]);

  useEffect(() => {
    let cleanup: (() => void) | null = null;
    let mounted = true;
    (async () => {
      const win = getCurrentWindow();
      const unlisten = await win.onCloseRequested(async (event) => {
        try {
          console.log({ keywords: keywordsRef.current, keywordTypes: keywordTypesRef.current, defaults: defaultCharactersRef.current, promptGenerators: promptGeneratorsRef.current });
          await invoke("save_data", { payload: {
            keywords: keywordsRef.current.map(({ id, ...rest }) => rest),
            keywordTypes: keywordTypesRef.current.map(({ id, ...rest }) => rest),
            defaults: defaultCharactersRef.current,
            promptGenerators: promptGeneratorsRef.current
          } });
        } catch (e) {
          console.error("save_data failed:", e);
          event.preventDefault();
        }
      });
      if (mounted) cleanup = unlisten;
      else unlisten();
    })();
    return () => { mounted = false; if (cleanup) cleanup(); };
  }, []);

  return <div className="workspace">
    <div className="workspace-tabs-header">
      <Tabs id="workspace-tabs" selectedTabId={value} onChange={(newTabId) => setValue(newTabId as WorkspaceTabId)}>
        <Tab id="prompt-generators" title="プロンプト生成" />
        <Tab id="keywords" title="キーワード設定" />
        <Tab id="keyword-types" title="キーワードのタイプ" />
      </Tabs>
    </div>
    <main className="workspace-content">
      {message && <div className="load-error">{message}</div>}
      {value === "prompt-generators" && <PromptGeneratorsTab />}
      {value === "keywords" && <KeywordsTab />}
      {value === "keyword-types" && <KeywordTypesTab />}
    </main>
  </div>;
}
