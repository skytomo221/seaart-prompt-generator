import { KeywordType } from "./data";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import IconButton from "@mui/material/IconButton";
import { v4 as uuidv4 } from "uuid";
import { useKeywordTypesDispatch, useKeywordTypesStore } from "./contexts/keywordTypesContext";
import TextField from "@mui/material/TextField";
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { MuiColorInput } from 'mui-color-input'
import React from "react";

type KeywordFormProps = {
  index: number;
}

function KeywordTypeForm({ index }: KeywordFormProps) {
  const keywords = useKeywordTypesStore();
  const keyword = keywords[index];
  const keywordTypesDispatch = useKeywordTypesDispatch();
  if (!keyword) return null;
  const { name, color } = keyword;

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
      <Card sx={{ flex: 1 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="キーワードのタイプの名前"
              value={name}
              onChange={(e) => {
                keywordTypesDispatch({
                  type: "UPDATE_KEYWORD_TYPE",
                  index,
                  payload: { ...keyword, name: e.target.value }
                });
              }}
              sx={{ flex: 2 }} />
            <MuiColorInput
              label="キーワードのタイプの色"
              value={color}
              onChange={(color) => {
                keywordTypesDispatch({
                  type: "UPDATE_KEYWORD_TYPE",
                  index,
                  payload: { ...keyword, color }
                });
              }}
              sx={{ flex: 1 }} />
            <MuiColorInput
              label="キーワードのタイプの背景色"
              value={keyword.backgroundColor}
              onChange={(backgroundColor) => {
                keywordTypesDispatch({
                  type: "UPDATE_KEYWORD_TYPE",
                  index,
                  payload: { ...keyword, backgroundColor }
                });
              }}
              sx={{ flex: 1 }} />
          </Box>
        </CardContent>
        <CardActions>
          <Box>
            <IconButton aria-label="move up"
              onClick={() => {
                if (index === 0) return;
                keywordTypesDispatch({
                  type: "MOVE_KEYWORD_TYPE",
                  fromIndex: index,
                  toIndex: index - 1
                });
              }}>
              <ArrowUpwardIcon />
            </IconButton>
            <IconButton aria-label="move down"
              onClick={() => {
                if (index === keywords.length - 1) return;
                keywordTypesDispatch({
                  type: "MOVE_KEYWORD_TYPE",
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
                keywordTypesDispatch({
                  type: "REMOVE_KEYWORD_TYPE",
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

function KeywordTypeForms() {
  const keywordTypes = useKeywordTypesStore();
  const keywordTypesDispatch = useKeywordTypesDispatch();

  return (
    keywordTypes.map((keywordType, index) => (
      <React.Fragment key={keywordType.id}>
        <KeywordTypeForm index={index} />
        <Button variant="outlined" startIcon={<AddIcon />} sx={{ mb: 2 }}
          onClick={() => {
            const newKeyword: KeywordType = { id: uuidv4(), name: "", color: "", backgroundColor: "" };
            const insertIndex = index + 1;
            keywordTypesDispatch({
              type: "ADD_KEYWORD_TYPE",
              index: insertIndex,
              payload: newKeyword
            });
          }}>
          キーワードタイプを追加
        </Button>
      </React.Fragment>
    ))
  );
}

export default KeywordTypeForms;
