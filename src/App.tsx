import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Data } from "./data";
import Typography from '@mui/material/Typography';
import PromptGenerator from "./PromptGenerator";
import Box from "@mui/material/Box";
import Stack from '@mui/material/Stack';

type PromptGenerator = {
  selectedKeywordNames: string[];
}

function App() {
  const [message, setMessage] = useState("");
  const [data, setData] = useState<Data>({
    characterTypeName: "",
    keywords: [],
    defaults: [],
  });
  const [promptGenerators, setPromptGenerators] = useState<PromptGenerator[]>([{ selectedKeywordNames: Array(8).fill("空白") }]);

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
        {
          promptGenerators.map((pg, index) => (
            <Stack key={index} direction="row">
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
                    updated[index] = { ...updated[index], selectedKeywordNames: resolved };
                    return updated;
                  });
                }}
                onClickCopyToLeft={() => {
                  setPromptGenerators((prev) => {
                    const updated = [...prev];
                    updated.splice(index, 0, { selectedKeywordNames: pg.selectedKeywordNames });
                    return updated;
                  });
                }}
                onClickCopyToRight={() => {
                  setPromptGenerators((prev) => {
                    const updated = [...prev];
                    updated.splice(index + 1, 0, { selectedKeywordNames: pg.selectedKeywordNames });
                    return updated;
                  });
                }}
              />
            </Stack>
          ))
        }
      </Box>
    </div>
  );
}

export default App;
