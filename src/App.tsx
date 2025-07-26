import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Data, Keyword } from "./data";

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
      <h1>SeaArt Prompt Generator</h1>
      <div>{message}</div>
      <h2>プロンプト生成</h2>
      <div>
        <div id="keywords"></div>
        {
          selectedKeywordNames.map((keyword, index) => (
            <div key={index} className="keyword-input">
              <select
                value={keyword}
                onChange={(e) => {
                  const newKeywords = [...selectedKeywordNames];
                  newKeywords[index] = e.target.value;
                  setSelectedKeywordNames(newKeywords);
                }}
              >
                <option value="">空白</option>
                {data.keywords.map((kw, i) => (
                  <option key={i} value={kw.name}>
                    {kw.name}
                  </option>
                ))}
              </select>
            </div>
          ))
        }
        <button id="add-keyword" onClick={addKeyword}>キーワードを追加する</button>
      </div>
      <h2>生成されたプロンプト</h2>
      <pre id="prompt-output">
        {getPrompts()}
      </pre>
      <h2>生成されたネガティブプロンプト</h2>
      <pre id="negative-prompt-output">
        {getNegativePrompts()}
      </pre>
    </div>
  );
}

export default App;
