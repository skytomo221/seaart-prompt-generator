import Box from "@mui/material/Box";
import Stack from '@mui/material/Stack';
import KeywordTypeForms from "./KeywordTypeForms";

export default function KeywordTypesTab() {
  return (
    <Box sx={{ my: 2 }}>
      <Stack>
        <KeywordTypeForms />
      </Stack>
    </Box>
  );
}
