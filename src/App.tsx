import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Data } from "./data";
import Typography from '@mui/material/Typography';
import PromptGenerator from "./PromptGenerator";
import Box from "@mui/material/Box";
import Stack from '@mui/material/Stack';
import { v4 as uuidv4 } from "uuid";

type SelectedKeywordName = {
  id: string;
  name: string;
}

type PromptGenerator = {
  selectedKeywordNames: SelectedKeywordName[];
}

function App() {
  const [message, setMessage] = useState("");
  const [data, setData] = useState<Data>({
    characterTypeName: "",
    keywords: [],
    defaults: [],
  });
  const [promptGenerators, setPromptGenerators] = useState<PromptGenerator[]>([{ selectedKeywordNames: Array(8).fill({ name: "空白", }).map((v) => ({ id: uuidv4(), ...v })) }]);

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
            <Stack key={`prompt-${index}`} direction="row">
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
