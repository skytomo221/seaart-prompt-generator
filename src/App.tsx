import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Data } from "./data";
import Typography from '@mui/material/Typography';
import PromptGenerator from "./PromptGenerator";

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
  const [promptGenerators, setPromptGenerators] = useState<PromptGenerator[]>([{selectedKeywordNames: ["空白"]}]);

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
      <Typography variant="h3" component="h1">SeaArt Prompt Generator</Typography>
      <div>{message}</div>
      {
        promptGenerators.map((pg, index) => (
          <PromptGenerator
            key={index}
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
          />
        ))
      }
    </div>
  );
}

export default App;
