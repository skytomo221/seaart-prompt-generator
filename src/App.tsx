import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Data } from "./data";
import PromptGenerator from "./PromptGenerator";
import Box from "@mui/material/Box";
import Stack from '@mui/material/Stack';
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

type SelectedKeywordName = {
  id: string;
  name: string;
}

type PromptGenerator = {
  id: string;
  selectedKeywordNames: SelectedKeywordName[];
}

function App() {
  const [message, setMessage] = useState("");
  const [data, setData] = useState<Data>({
    characterTypeName: "",
    keywords: [],
    defaults: [],
  });
  const [promptGenerators, setPromptGenerators] = useState<PromptGenerator[]>(
    [
      {
        id: uuidv4(),
        selectedKeywordNames: Array(8).fill({ name: "空白", }).map((v) => ({ id: uuidv4(), ...v }))
      }
    ]
  );

  useEffect(() => {
    invoke("load_config")
      .then((res) => {
        const data = res as Data;
        setData(data);
      })
      .catch((err) => {
        setMessage(String(err));
      });
  }, []);

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
                <PromptGenerator
                  index={index}
                  data={data}
                  selectedKeywordNames={pg.selectedKeywordNames}
                  setSelectedKeywordNames={(updatedKeywordNames) => {
                    setPromptGenerators((prev) => {
                      const updated = [...prev];
                      const current = updated[index].selectedKeywordNames;
                      const resolved =
                        typeof updatedKeywordNames === "function" ? updatedKeywordNames(current) : updatedKeywordNames;
                      updated[index] = { ...updated[index], selectedKeywordNames: resolved, };
                      return updated;
                    });
                  }}
                  onClickDelete={() => {
                    setPromptGenerators((prev) => {
                      const updated = [...prev];
                      updated.splice(index, 1);
                      return updated;
                    });
                  }}
                  onClickCopyToLeft={() => {
                    setPromptGenerators((prev) => {
                      const updated = [...prev];
                      updated.splice(index, 0, {
                        id: uuidv4(),
                        selectedKeywordNames: pg.selectedKeywordNames.map(k => ({ ...k, id: uuidv4() })),
                      });
                      return updated;
                    });
                  }}
                  onClickCopyToRight={() => {
                    setPromptGenerators((prev) => {
                      const updated = [...prev];
                      updated.splice(index + 1, 0, {
                        id: uuidv4(),
                        selectedKeywordNames: pg.selectedKeywordNames.map(k => ({ ...k, id: uuidv4() })),
                      });
                      return updated;
                    });
                  }}
                />
              </Stack>
            </motion.div>
          ))}
        </AnimatePresence>
      </Box>
    </div>
  );
}

export default App;
