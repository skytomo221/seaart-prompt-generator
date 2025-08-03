import * as React from 'react';
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Data } from "./data";
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import PromptGeneratorsTab from './PromptGeneratorsTab';
import { useKeywordsDispatch } from './contexts/keywordsContext';
import { useDefaultCharactersDispatch } from './contexts/defaultsContext';
import { usePromptGeneratorsStore, usePromptGeneratorsDispatch } from './contexts/promptGeneratorsContext';

export default function TabsWrappedLabel() {
  const [value, setValue] = React.useState('prompt-generators');
  const [message, setMessage] = useState("");

  const keywordsDispatch = useKeywordsDispatch();
  const defaultCharactersDispatch = useDefaultCharactersDispatch();
  const promptGenerators = usePromptGeneratorsStore();
  const promptGeneratorsDispatch = usePromptGeneratorsDispatch();

  useEffect(() => {
    invoke("load_config")
      .then((res) => {
        const data = res as Data;
        keywordsDispatch({ type: "SET_KEYWORDS", payload: data.keywords });
        defaultCharactersDispatch({ type: "SET_DEFAULT_CHARACTERS", payload: data.defaults });
      })
      .catch((err) => {
        setMessage(String(err));
      });
  }, [keywordsDispatch, defaultCharactersDispatch, promptGenerators.length, promptGeneratorsDispatch]);

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
      </Box>
    </Box>
  );
}
