import { Data, Keyword } from "./data";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import ForkLeftIcon from '@mui/icons-material/ForkLeft';
import ForkRightIcon from '@mui/icons-material/ForkRight';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import KeywordSelect from "./KeywordSelect";
import ResultText from "./ResultText";
import IconButton from "@mui/material/IconButton";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { v4 as uuidv4 } from "uuid";
import { Fragment } from "react/jsx-runtime";
import { useRef, useState } from "react";

function InsertButton({ onClick }: { onClick: () => void }) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | undefined>();

  const handleMouseEnter = () => {
    timeoutRef.current = window.setTimeout(() => {
      setVisible(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <Box
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        position: "relative",
        height: 12,
        my: -0.8,
      }}
    >
      <Box
        sx={{
          height: "3px",
          opacity: visible ? 1 : 0,
          backgroundColor: "divider",
        }}
      />

      {visible && (
        <IconButton
          onClick={onClick}
          color="success"
          sx={{
            position: "absolute",
            left: "50%",
            transform: "translate(-50%, -50%)",
            border: "1px solid",
            transition: "opacity 0.2s ease",
            opacity: visible ? 1 : 0,
          }}
        >
          <AddIcon />
        </IconButton>
      )}
    </Box>
  );
}

function SortableKeyword({
  id,
  keywordName,
  onKeywordChange,
  keywords,
}: {
  id: string;
  index: number;
  keywordName: string;
  onKeywordChange: (value: string | null) => void;
  onKeywordDelete: () => void;
  keywords: Keyword[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Box ref={setNodeRef} style={style} {...attributes} sx={{ display: "flex", alignItems: "center", ml: -1.5, mb: 1, cursor: "grab" }}>
      <IconButton {...listeners} disableRipple sx={{ cursor: "grab" }}>
        <DragHandleIcon />
      </IconButton>
      <KeywordSelect
        keywordName={keywordName}
        keywords={keywords}
        onkeywordNameChange={onKeywordChange}
      />
    </Box>
  );
}

type SelectedKeywordName = {
  id: string;
  name: string;
}

interface PromptGeneratorProps {
  index: number;
  data: Data;
  selectedKeywordNames: SelectedKeywordName[];
  setSelectedKeywordNames: React.Dispatch<React.SetStateAction<SelectedKeywordName[]>>;
  onClickDelete?: () => void;
  onClickCopyToLeft?: () => void;
  onClickCopyToRight?: () => void;
}

function PromptGenerator({ index, data, selectedKeywordNames, setSelectedKeywordNames, onClickDelete, onClickCopyToLeft, onClickCopyToRight }: PromptGeneratorProps) {
  function addKeyword() {
    setSelectedKeywordNames((prev) => [...prev, { id: uuidv4(), name: "空白" }]);
  }

  function insertKeywordAt(index: number) {
    setSelectedKeywordNames((prev) => {
      const newKeyword = { id: uuidv4(), name: "空白" };
      const newArray = [...prev.slice(0, index), newKeyword, ...prev.slice(index)];
      return newArray;
    });
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
    const selectedKeywords = selectedKeywordNames.map((selectedKeywordName) =>
      data.keywords.find((k) => k.name === selectedKeywordName.name)
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

  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = selectedKeywordNames.findIndex((item) => item.id === active.id);
    const newIndex = selectedKeywordNames.findIndex((item) => item.id === over.id);
    const newArray = arrayMove(selectedKeywordNames, oldIndex, newIndex);
    setSelectedKeywordNames(newArray);
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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={selectedKeywordNames.map((keywordName) => keywordName.id)} strategy={verticalListSortingStrategy}>
                {selectedKeywordNames.map((keywordName, i) => (
                  <Fragment key={keywordName.id}>
                    <InsertButton onClick={() => insertKeywordAt(i)} />
                    <SortableKeyword
                      key={keywordName.id}
                      id={keywordName.id}
                      index={i}
                      keywordName={keywordName.name}
                      onKeywordChange={(newName) => {
                        if (newName === "削除する") {
                          setSelectedKeywordNames((prev) => prev.filter((_, idx) => idx !== i));
                        } else {
                          setSelectedKeywordNames((prev) =>
                            prev.map((item, idx) =>
                              idx === i ? { ...item, name: newName ?? "空白" } : item
                            )
                          );
                        }
                      }}
                      onKeywordDelete={() => {
                        setSelectedKeywordNames((prev) => prev.filter((_, idx) => idx !== i));
                      }}
                      keywords={data.keywords}
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
