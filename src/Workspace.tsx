import * as React from 'react';
import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Data } from "./data";
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import PromptGeneratorsTab from './PromptGeneratorsTab';
import KeywordsTab from './KeywordsTab';
import { useKeywordsDispatch, useKeywordsStore } from './contexts/keywordsContext';
import { useDefaultCharactersStore, useDefaultCharactersDispatch } from './contexts/defaultsContext';
import { usePromptGeneratorsStore, usePromptGeneratorsDispatch } from './contexts/promptGeneratorsContext';
import { PromptGenerator } from './promptGenerator';
import { v4 as uuidv4 } from "uuid";

export default function TabsWrappedLabel() {
  const [value, setValue] = React.useState('prompt-generators');
  const [message, setMessage] = useState("");

  const keywordsDispatch = useKeywordsDispatch();
  const defaultCharactersDispatch = useDefaultCharactersDispatch();
  const keywords = useKeywordsStore();
  const defaultCharacters = useDefaultCharactersStore();
  const promptGenerators = usePromptGeneratorsStore();
  const promptGeneratorsDispatch = usePromptGeneratorsDispatch();

  useEffect(() => {
    invoke("load_configs")
      .then((res) => {
        const { data, prompt_generators: promptGenerators } = res as { data: Data, prompt_generators: PromptGenerator[] };
        keywordsDispatch({ type: "SET_KEYWORDS", payload: data.keywords.map(keyword => ({ ...keyword, id: uuidv4() })) });
        defaultCharactersDispatch({ type: "SET_DEFAULT_CHARACTERS", payload: data.defaults });
        if (promptGenerators.length > 0) {
          promptGeneratorsDispatch({ type: "SET_PROMPT_GENERATORS", payload: promptGenerators });
        }
      })
      .catch((err) => {
        setMessage(String(err));
      });
  }, [keywordsDispatch, defaultCharactersDispatch, promptGenerators.length, promptGeneratorsDispatch]);

  const keywordsRef = useRef(keywords);
  const defaultCharactersRef = useRef(defaultCharacters);
  const promptGeneratorsRef = useRef(promptGenerators);
  useEffect(() => { keywordsRef.current = keywords; }, [keywords]);
  useEffect(() => { defaultCharactersRef.current = defaultCharacters; }, [defaultCharacters]);
  useEffect(() => { promptGeneratorsRef.current = promptGenerators; }, [promptGenerators]);

  useEffect(() => {
    let cleanup: (() => void) | null = null;
    let mounted = true;

    (async () => {
      const win = getCurrentWindow();
      const unlisten = await win.onCloseRequested(async (event) => {
        try {
          console.log(
            {
              keywords: keywordsRef.current,
              defaults: defaultCharactersRef.current,
              promptGenerators: promptGeneratorsRef.current
            }
          )
          await invoke("save_data", {
            payload: {
              keywords: keywordsRef.current.map(({ id, ...rest }) => rest),
              defaults: defaultCharactersRef.current,
              promptGenerators: promptGeneratorsRef.current
            }
          });
        } catch (e) {
          console.error("save_data failed:", e);
          event.preventDefault();
        }
      });

      if (mounted) {
        cleanup = unlisten;
      } else {
        unlisten();
      }
    })();

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, []);

  const handleChange = (_: React.SyntheticEvent, newValue: string) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          bgcolor: 'background.paper',
        }}
      >
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="wrapped label tabs example"
        >
          <Tab value="prompt-generators" label="プロンプト生成" />
          <Tab value="keywords" label="キーワード設定" />
        </Tabs>
      </Box>
      <Box pt={4}>
        <div>{message}</div>
        {value === "prompt-generators" && <PromptGeneratorsTab />}
        {value === "keywords" && <KeywordsTab />}
      </Box>
    </Box>
  );
}
