import * as React from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import DeleteIcon from '@mui/icons-material/Delete';
import SpaceBarIcon from '@mui/icons-material/SpaceBar';
import Typography from '@mui/material/Typography';
import { useKeywordsStore } from './contexts/keywordsContext';
import { usePromptGeneratorsStore, usePromptGeneratorsDispatch } from './contexts/promptGeneratorsContext';
import { SelectedKeywordName } from './selectedKeywordName';
import { useKeywordTypesStore } from './contexts/keywordTypesContext';

const defaultKeywordName = "空白";

// contextからindex, keywordName, onChangeを取得する前提の新しいKeywordSelect
export default function KeywordSelect({ selectedKeywordName }: { selectedKeywordName: SelectedKeywordName }) {
  const keywords = useKeywordsStore();
  const keywordTypes = useKeywordTypesStore();
  const promptGenerators = usePromptGeneratorsStore();
  const dispatch = usePromptGeneratorsDispatch();
  const [inputValue, setInputValue] = React.useState('');

  function getBackgroundColor(keywordName: string) {
    if (keywordTypes.some((kt) => kt.name === keywords.find((k) => k.name === keywordName)?.type)) {
      return keywordTypes.find((kt) => kt.name === keywords.find((k) => k.name === keywordName)?.type)?.backgroundColor;
    }
    return undefined;
  }

  function getColor(keywordName: string) {
    if (keywordTypes.some((kt) => kt.name === keywords.find((k) => k.name === keywordName)?.type)) {
      return keywordTypes.find((kt) => kt.name === keywords.find((k) => k.name === keywordName)?.type)?.color;
    }
    return undefined;
  }

  function renderKeywordName(keywordName: string) {
    if (keywordName === "削除する") {
      return <><DeleteIcon color='error' sx={{ mr: 1 }} /><Typography color="error">削除する</Typography></>;
    }
    if (keywordName === "空白") {
      return <><SpaceBarIcon color='disabled' sx={{ mr: 1 }} /><Typography color="disabled">空白</Typography></>;
    }
    return <><Typography sx={{ color: getColor(keywordName) }} >{keywordName}</Typography></>;
  }

  // 現在のkeywordNameをcontextから取得
  const index = promptGenerators.findIndex((pg) => pg.selectedKeywordNames.some((k) => k.id === selectedKeywordName.id));
  const keywordName = promptGenerators[index]?.selectedKeywordNames.find((k) => k.id === selectedKeywordName.id)?.name || defaultKeywordName;

  // 値変更時のdispatch
  const handleKeywordNameChange = (newKeywordName: string | null) => {
    if (!promptGenerators[index]) return;

    if (newKeywordName === "削除する") {
      const updated = promptGenerators[index].selectedKeywordNames.filter(
        (item) => item.id !== selectedKeywordName.id
      );
      dispatch({
        type: "UPDATE_PROMPT_GENERATOR",
        index,
        payload: { ...promptGenerators[index], selectedKeywordNames: updated }
      });
      return;
    }

    // 通常のキーワード名変更
    const updated = promptGenerators[index].selectedKeywordNames.map((item, i) =>
      item.id === selectedKeywordName.id ? { ...item, name: newKeywordName ?? defaultKeywordName } : item
    );
    dispatch({
      type: "UPDATE_PROMPT_GENERATOR",
      index,
      payload: { ...promptGenerators[index], selectedKeywordNames: updated }
    });
  };

  const keywordNames = ["削除する", "空白"]
    .concat(keywords.map((k) => k.name))
    .filter((v, i, arr) => v !== "" && arr.indexOf(v) === i);

  return (
    <Autocomplete
      value={keywordName}
      inputValue={inputValue}
      disableClearable
      fullWidth
      size="small"
      onChange={(_, newKeywordName: string | null) => {
        handleKeywordNameChange(newKeywordName);
      }}
      onInputChange={(_, newInputValue) => {
        setInputValue(newInputValue);
      }}
      options={keywordNames}
      renderOption={(props, option) => {
        const { key, ...optionProps } = props;
        return (
          <Box
            key={key}
            component="li"
            sx={{ '& > img': { mr: 2, flexShrink: 0 }, backgroundColor: getBackgroundColor(option) }}
            {...optionProps}
          >
            {renderKeywordName(option)}
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField {...params}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: getBackgroundColor(keywordName),
              '& .MuiOutlinedInput-input': {
                color: getColor(keywordName),
              },
            },
          }}
        />
      )}
    />
  );
}
