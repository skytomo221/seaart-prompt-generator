import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Data, Keyword } from "./data";
import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import KeywordSelect from "./KeywordSelect";

function App() {
  const [message, setMessage] = useState("");
  const [data, setData] = useState<Data>({
    characterTypeName: "",
    keywords: [],
    defaults: [],
  });
  const [selectedKeywordNames, setSelectedKeywordNames] = useState<string[]>([]);

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

  function addKeyword() {
    setSelectedKeywordNames((prev) => [...prev, ""]);
  }

  function mergeDefaults(selectedKeywords: Keyword[]): Keyword[] {
    let mergedKeywords: Keyword[] = [];
    selectedKeywords.forEach((s) => {
      if (s.type !== data.characterTypeName) {
        mergedKeywords.push(s);
        return;
      };
      const def = data.defaults.find((d) => d.character === s.name);
      if (!def) return;
      def.parts.forEach((part) => {
        const alreadySelected = selectedKeywords.some((sel) => sel.type === part.type);
        if (alreadySelected) return;
        const keyword: Keyword = { ...part, name: part.type };
        if (keyword) mergedKeywords.push(keyword);
      });
    });
    return mergedKeywords;
  }

  function collectSelectedKeywords(): Keyword[] {
    const selectedKeywords = selectedKeywordNames.map((name) =>
      data.keywords.find((k) => k.name === name)
    ).filter((k): k is Keyword => !!k);
    return mergeDefaults(selectedKeywords);
  }

  function getPrompts(): string {
    const selecteds = collectSelectedKeywords();
    return selecteds.map((s) => s.prompt).join(",");
  }

  function getNegativePrompts(): string {
    const selecteds = collectSelectedKeywords();
    return selecteds
      .map((s) => s.negativePrompt)
      .filter((np): np is string => !!np && np.trim() !== "")
      .join(",");
  }

  return (
    <div style={{ padding: "1em" }}>
      <Typography variant="h3" component="h1">SeaArt Prompt Generator</Typography>
      <div>{message}</div>
      <Box
        component="span"
        sx={{ display: 'inline-block', mx: '2px' }}
      >
        <Card sx={{ minWidth: 275 }}>
          <CardContent>
            <Typography variant="body1" component="h2">プロンプト生成</Typography>
            <div>
              <div id="keywords"></div>
              {
                selectedKeywordNames.map((keywordName, index) => (
                  <div key={keywordName + index} className="keyword-input">
                    <KeywordSelect
                      keywordName={keywordName}
                      keywords={data.keywords}
                      onkeywordNameChange={(keywordName) => {
                        const newKeywords = [...selectedKeywordNames];
                        newKeywords[index] = keywordName ?? "";
                        setSelectedKeywordNames(newKeywords);
                      }}
                    />
                  </div>
                ))
              }
              <CardActions>
                <Button id="add-keyword" variant="outlined" startIcon={<AddIcon />} sx={{ width: "100%" }} onClick={addKeyword}>キーワードを追加する</Button>
              </CardActions>
            </div>
            <Typography variant="body1" component="h2">生成されたプロンプト</Typography>
            <pre id="prompt-output">
              {getPrompts()}
            </pre>
            <Typography variant="body1" component="h2">生成されたネガティブプロンプト</Typography>
            <pre id="negative-prompt-output">
              {getNegativePrompts()}
            </pre>
          </CardContent>
        </Card>
      </Box>
    </div>
  );
}

export default App;
