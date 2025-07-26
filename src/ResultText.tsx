import * as React from 'react';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

interface ResultTextProps {
  text: string;
}

export default function ResultText({ text }: ResultTextProps) {
  const [openSnackbar, setOpenSnackbar] = React.useState(false);

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(text).then(() => {
      setOpenSnackbar(true);
    });
  };

  const handleCloseSnackbar = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };

  return (
    <>
      <Paper
        component="div"
        sx={{ p: '2px 4px', display: 'flex', alignItems: 'center' }}
      >
        <InputBase
          sx={{ ml: 1, flex: 1 }}
          value={text}
          inputProps={{ 'aria-label': 'result text' }}
          readOnly
        />
        <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
        <IconButton
          color="primary"
          size="small"
          aria-label="copy to clipboard"
          onClick={handleCopyToClipboard}
        >
          <ContentCopyIcon />
        </IconButton>
      </Paper>
      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          sx={{ width: '100%' }}
        >
          クリップボードにコピーしました！
        </Alert>
      </Snackbar>
    </>
  );
}
