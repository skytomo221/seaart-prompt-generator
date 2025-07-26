import * as React from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { Keyword } from './data';

interface KeywordSelectProps {
  keywordName: string;
  keywords: Keyword[];
  onkeywordNameChange?: (keywordName: string) => void;
}

const defaultKeywordName = "空白";

export default function KeywordSelect({ keywordName, keywords, onkeywordNameChange, }: KeywordSelectProps) {
  const [inputValue, setInputValue] = React.useState('');

  React.useEffect(() => {
    if (onkeywordNameChange) {
      onkeywordNameChange(keywordName);
    }
  }, [keywordName, onkeywordNameChange]);
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
      options={keywords.map((k) => k.name)}
      renderInput={(params) => <TextField {...params} />}
    />
  );
}
