import PromptGeneratorForm from "./PromptGeneratorForm";
import Box from "@mui/material/Box";
import Stack from '@mui/material/Stack';
import { motion, AnimatePresence } from "framer-motion";
import { usePromptGeneratorsStore } from "./contexts/promptGeneratorsContext";

export default function PromptGeneratorsTab() {
  const promptGenerators = usePromptGeneratorsStore();

  return (
    <Box sx={{ my: 2, display: "flex" }}>
      <AnimatePresence initial={false}>
        {promptGenerators.map((pg, index) => (
          <motion.div
            key={pg.id}
            layout="position"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Stack direction="row">
              <PromptGeneratorForm index={index} />
            </Stack>
          </motion.div>
        ))}
      </AnimatePresence>
    </Box>
  );
}
