import { Data, Keyword } from "./data";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import ForkLeftIcon from '@mui/icons-material/ForkLeft';
import ForkRightIcon from '@mui/icons-material/ForkRight';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import KeywordSelect from "./KeywordSelect";
import ResultText from "./ResultText";
import IconButton from "@mui/material/IconButton";

interface PromptGeneratorProps {
  index: number;
  data: Data;
  selectedKeywordNames: string[];
  setSelectedKeywordNames: React.Dispatch<React.SetStateAction<string[]>>;
  onClickDelete?: () => void;
  onClickCopyToLeft?: () => void;
  onClickCopyToRight?: () => void;
}

function PromptGenerator({ index, data, selectedKeywordNames, setSelectedKeywordNames, onClickDelete, onClickCopyToLeft, onClickCopyToRight }: PromptGeneratorProps) {
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
    <Box
      component="span"
      sx={{ display: 'inline-block', mx: '2px' }}
    >
      <Card sx={{ minWidth: 275 }}>
        <CardContent>
          <Box sx={{ display: 'flex' }}>
            <Typography variant="h6" component="h2" sx={{ color: 'text.secondary' }}>
              #{index + 1}
            </Typography>
            <Box style={{ flexGrow: 1 }} />
            <Tooltip title="プロンプトを削除する">
              <IconButton aria-label="delete" onClick={onClickDelete}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="body1" component="h3">プロンプト生成</Typography>
          <div>
            <div id="keywords"></div>
            {
              selectedKeywordNames.map((keywordName, index) => (
                <div key={keywordName + index} className="keyword-input" style={{ display: "flex", alignItems: "center" }}>
                  <KeywordSelect
                    keywordName={keywordName}
                    keywords={data.keywords}
                    onkeywordNameChange={(keywordName) => {
                      if (keywordName === "削除する") {
                        const newKeywords = [...selectedKeywordNames];
                        newKeywords.splice(index, 1);
                        setSelectedKeywordNames(newKeywords);
                        return;
                      }
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
          <Box sx={{ mt: 1 }}>
            <Typography variant="body1" component="h3">生成されたプロンプト</Typography>
            <ResultText text={getPrompts()} />
          </Box>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body1" component="h3">生成されたネガティブプロンプト</Typography>
            <ResultText text={getNegativePrompts()} />
          </Box>
        </CardContent>
        <CardActions>
          <Tooltip title="左にコピーする">
            <IconButton onClick={onClickCopyToLeft}>
              <ForkLeftIcon />
            </IconButton>
          </Tooltip>
          <Box style={{ flexGrow: 1 }} />
          <Tooltip title="右にコピーする">
            <IconButton onClick={onClickCopyToRight}>
              <ForkRightIcon />
            </IconButton>
          </Tooltip>
        </CardActions>
      </Card>
    </Box >
  );
}

export default PromptGenerator;
