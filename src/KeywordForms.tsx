import { Keyword } from "./data";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import IconButton from "@mui/material/IconButton";
import { v4 as uuidv4 } from "uuid";
import { useKeywordsDispatch, useKeywordsStore } from "./contexts/keywordsContext";
import TextField from "@mui/material/TextField";
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import React from "react";

type KeywordFormProps = {
  index: number;
}

function KeywordForm({ index }: KeywordFormProps) {
  const keywords = useKeywordsStore();
  const keyword = keywords[index];
  const keywordsDispatch = useKeywordsDispatch();
  if (!keyword) return null;
  const { name, type, prompt, negativePrompt } = keyword;

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
      <Card sx={{ flex: 1 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="キーワードの名前"
              value={name}
              onChange={(e) => {
                keywordsDispatch({
                  type: "UPDATE_KEYWORD",
                  index,
                  payload: { ...keyword, name: e.target.value }
                });
              }}
              sx={{ flex: 2 }} />
            <TextField
              label="キーワードの種類"
              value={type}
              onChange={(e) => {
                keywordsDispatch({
                  type: "UPDATE_KEYWORD",
                  index,
                  payload: { ...keyword, type: e.target.value }
                });
              }}
              sx={{ flex: 1 }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="キーワードのプロンプト"
              value={prompt}
              onChange={(e) => {
                keywordsDispatch({
                  type: "UPDATE_KEYWORD",
                  index,
                  payload: { ...keyword, prompt: e.target.value }
                });
              }}
              slotProps={{
                input: {
                  style: {
                    fontFamily: "consolas, 'Courier New', monospace",
                  }
                },
              }} fullWidth multiline />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="キーワードのネガティブプロンプト"
              value={negativePrompt ?? ""}
              onChange={(e) => {
                keywordsDispatch({
                  type: "UPDATE_KEYWORD",
                  index,
                  payload: { ...keyword, negativePrompt: e.target.value }
                });
              }}
              slotProps={{
                input: {
                  style: {
                    fontFamily: "consolas, 'Courier New', monospace",
                  }
                },
              }} fullWidth multiline />
          </Box>
        </CardContent>
        <CardActions>
          <Box>
            <IconButton aria-label="move up"
              onClick={() => {
                if (index === 0) return;
                keywordsDispatch({
                  type: "MOVE_KEYWORD",
                  fromIndex: index,
                  toIndex: index - 1
                });
              }}>
              <ArrowUpwardIcon />
            </IconButton>
            <IconButton aria-label="move down"
              onClick={() => {
                if (index === keywords.length - 1) return;
                keywordsDispatch({
                  type: "MOVE_KEYWORD",
                  fromIndex: index,
                  toIndex: index + 1
                });
              }}>
              <ArrowDownwardIcon />
            </IconButton>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Box>
            <IconButton aria-label="delete"
              onClick={() => {
                keywordsDispatch({
                  type: "REMOVE_KEYWORD",
                  index
                });
              }}>
              <DeleteIcon />
            </IconButton>
          </Box>
        </CardActions>
      </Card>
    </Box >
  );
}

function KeywordForms() {
  const keywords = useKeywordsStore();
  const keywordsDispatch = useKeywordsDispatch();

  return (
    keywords.map((keyword, index) => (
      <React.Fragment key={keyword.id}>
        <KeywordForm index={index} />
        <Button variant="outlined" startIcon={<AddIcon />} sx={{ mb: 2 }}
          onClick={() => {
            const newKeyword: Keyword = { id: uuidv4(), name: "", type: "", prompt: "" };
            const insertIndex = index + 1;
            keywordsDispatch({
              type: "ADD_KEYWORD",
              index: insertIndex,
              payload: newKeyword
            });
          }}>
          キーワードを追加
        </Button>
      </React.Fragment>
    ))
  );
}

export default KeywordForms;
