import * as React from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { Keyword } from './data';
import Box from '@mui/material/Box';
import DeleteIcon from '@mui/icons-material/Delete';
import SpaceBarIcon from '@mui/icons-material/SpaceBar';
import Typography from '@mui/material/Typography';

interface KeywordSelectProps {
  keywordName: string;
  keywords: Keyword[];
  onkeywordNameChange?: (keywordName: string) => void;
}

const defaultKeywordName = "空白";

function renderKeywordName(keywordName: string) {
  if (keywordName === "削除する") {
    return <><DeleteIcon color='error' sx={{ mr: 1 }} /><Typography color="error">削除する</Typography></>;
  }
  if (keywordName === "空白") {
    return <><SpaceBarIcon color='disabled' sx={{ mr: 1 }} /><Typography color="disabled">空白</Typography></>;
  }
  return keywordName;
}

export default function KeywordSelect({ keywordName, keywords, onkeywordNameChange, }: KeywordSelectProps) {
  const [inputValue, setInputValue] = React.useState('');

  return (
    <Autocomplete
      value={keywordName}
      inputValue={inputValue}
      disableClearable
      fullWidth
      size="small"
      onChange={(_, newKeywordName: string | null) => {
        if (onkeywordNameChange) {
          onkeywordNameChange(newKeywordName ?? defaultKeywordName);
        }
      }}
      onInputChange={(_, newInputValue) => {
        setInputValue(newInputValue);
      }}
      options={["削除する", "空白"].concat(keywords.map((k) => k.name))}
      renderOption={(props, option) => {
        const { key, ...optionProps } = props;
        return (
          <Box
            key={key}
            component="li"
            sx={{ '& > img': { mr: 2, flexShrink: 0 } }}
            {...optionProps}
          >
            {renderKeywordName(option)}
          </Box>
        );
      }}
      renderInput={(params) => <TextField {...params} />}
    />
  );
}
