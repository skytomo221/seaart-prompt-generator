import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Data } from "./data";
import PromptGenerator from "./PromptGenerator";
import Box from "@mui/material/Box";
import Stack from '@mui/material/Stack';
import { motion, AnimatePresence } from "framer-motion";
import { KeywordsProvider, useKeywordsDispatch, useKeywordsStore } from "./contexts/keywordsContext";
import { DefaultCharactersProvider, useDefaultCharactersDispatch } from "./contexts/defaultsContext";
import { PromptGeneratorsProvider, usePromptGeneratorsStore, usePromptGeneratorsDispatch } from "./contexts/promptGeneratorsContext";
import { CharacterTypeNameProvider } from "./contexts/characterTypeNameContext";

function AppContent() {
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

  return (
    <div style={{ padding: "1em" }}>
      <div>{message}</div>
      <Box sx={{ my: 2, display: "flex" }}>
        <AnimatePresence initial={false}>
          {promptGenerators.map((pg, index) => (
            <motion.div
              key={pg.id}
              layout="position"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Stack direction="row">
                <PromptGenerator index={index} />
              </Stack>
            </motion.div>
          ))}
        </AnimatePresence>
      </Box>
    </div>
  );
}

function App() {
  return (
    <KeywordsProvider>
      <DefaultCharactersProvider>
        <PromptGeneratorsProvider>
          <CharacterTypeNameProvider>
            <AppContent />
          </CharacterTypeNameProvider>
        </PromptGeneratorsProvider>
      </DefaultCharactersProvider>
    </KeywordsProvider>
  );
}

export default App;
