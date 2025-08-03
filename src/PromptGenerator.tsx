import { Keyword } from "./data";
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
import ResultText from "./ResultText";
import IconButton from "@mui/material/IconButton";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { v4 as uuidv4 } from "uuid";
import { Fragment } from "react/jsx-runtime";
import { useKeywordsStore } from "./contexts/keywordsContext";
import { useDefaultCharactersStore } from "./contexts/defaultsContext";
import { usePromptGeneratorsStore, usePromptGeneratorsDispatch } from "./contexts/promptGeneratorsContext";
import { useCharacterTypeNameStore } from "./contexts/characterTypeNameContext";
import InsertButton from "./InsertButton";
import SortableKeyword from "./SortableKeyword";

interface PromptGeneratorProps {
  index: number;
}

function PromptGenerator({ index }: PromptGeneratorProps) {
  const keywords = useKeywordsStore();
  const defaultCharacters = useDefaultCharactersStore();
  const promptGenerators = usePromptGeneratorsStore();
  const promptGeneratorsDispatch = usePromptGeneratorsDispatch();
  const characterTypeName = useCharacterTypeNameStore();

  const sensors = useSensors(useSensor(PointerSensor));

  const pg = promptGenerators[index];
  if (!pg) return null;

  function addKeyword() {
    const updated = [...pg.selectedKeywordNames, { id: uuidv4(), name: "空白" }];
    promptGeneratorsDispatch({
      type: "UPDATE_PROMPT_GENERATOR",
      index,
      payload: { ...pg, selectedKeywordNames: updated }
    });
  }

  function insertKeywordAt(idx: number) {
    const newKeyword = { id: uuidv4(), name: "空白" };
    const updated = [...pg.selectedKeywordNames.slice(0, idx), newKeyword, ...pg.selectedKeywordNames.slice(idx)];
    promptGeneratorsDispatch({
      type: "UPDATE_PROMPT_GENERATOR",
      index,
      payload: { ...pg, selectedKeywordNames: updated }
    });
  }

  function mergeDefaults(selectedKeywords: Keyword[]): Keyword[] {
    let mergedKeywords: Keyword[] = [];
    selectedKeywords.forEach((s) => {
      mergedKeywords.push(s);
      if (s.type !== characterTypeName) return;
      const def = defaultCharacters.find((d) => d.character === s.name);
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
    const selectedKeywords = pg.selectedKeywordNames.map((selectedKeywordName) =>
      keywords.find((k) => k.name === selectedKeywordName.name)
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pg.selectedKeywordNames.findIndex((selectedKeywordName) => `${selectedKeywordName.id}` === active.id);
    const newIndex = pg.selectedKeywordNames.findIndex((selectedKeywordName) => `${selectedKeywordName.id}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newArray = arrayMove(pg.selectedKeywordNames, oldIndex, newIndex);
    promptGeneratorsDispatch({
      type: "UPDATE_PROMPT_GENERATOR",
      index,
      payload: { ...pg, selectedKeywordNames: newArray }
    });
  }

  return (
    <Box component="span" sx={{ display: 'inline-block', mx: '2px' }}>
      <Card sx={{ minWidth: 275 }}>
        <CardContent>
          <Box sx={{ display: 'flex' }}>
            <Typography variant="h6" component="h2" sx={{ color: 'text.secondary' }}>
              #{index + 1}
            </Typography>
            <Box style={{ flexGrow: 1 }} />
            <Tooltip title="プロンプトを削除する">
              <IconButton aria-label="delete" onClick={() => promptGeneratorsDispatch({ type: "REMOVE_PROMPT_GENERATOR", index })}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="body1" component="h3">プロンプト生成</Typography>
          <div>
            <div id="keywords"></div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={pg.selectedKeywordNames.map((selectedKeywordName) => `${selectedKeywordName.id}`)} strategy={verticalListSortingStrategy}>
                {pg.selectedKeywordNames.map((keywordName, i) => (
                  <Fragment key={keywordName.id}>
                    <InsertButton onClick={() => insertKeywordAt(i)} />
                    <SortableKeyword
                      selectedKeywordName={keywordName}
                    />
                  </Fragment>
                ))}
              </SortableContext>
            </DndContext>
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
            <IconButton onClick={() => {
              const newPromptGenerator = {
                id: uuidv4(),
                selectedKeywordNames: pg.selectedKeywordNames.map(k => ({ ...k, id: uuidv4() })),
              };
              promptGeneratorsDispatch({ type: "ADD_PROMPT_GENERATOR", index, payload: newPromptGenerator });
            }}>
              <ForkLeftIcon />
            </IconButton>
          </Tooltip>
          <Box style={{ flexGrow: 1 }} />
          <Tooltip title="右にコピーする">
            <IconButton onClick={() => {
              const newPromptGenerator = {
                id: uuidv4(),
                selectedKeywordNames: pg.selectedKeywordNames.map(k => ({ ...k, id: uuidv4() })),
              };
              promptGeneratorsDispatch({ type: "ADD_PROMPT_GENERATOR", index: index + 1, payload: newPromptGenerator });
            }}>
              <ForkRightIcon />
            </IconButton>
          </Tooltip>
        </CardActions>
      </Card>
    </Box >
  );
}

export default PromptGenerator;
