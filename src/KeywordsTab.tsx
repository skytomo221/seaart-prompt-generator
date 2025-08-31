import Box from "@mui/material/Box";
import Stack from '@mui/material/Stack';
import KeywordForms from "./KeywordForms";

export default function KeywordsTab() {
  return (
    <Box sx={{ my: 2 }}>
      <Stack>
        <KeywordForms />
      </Stack>
    </Box>
  );
}
