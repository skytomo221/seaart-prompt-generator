import PromptGeneratorForm from "./PromptGeneratorForm";
import { motion, AnimatePresence } from "framer-motion";
import { usePromptGeneratorsStore } from "./contexts/promptGeneratorsContext";

export default function PromptGeneratorsTab() {
  const promptGenerators = usePromptGeneratorsStore();
  return <div className="prompt-generators-tab">
    <AnimatePresence initial={false}>
      {promptGenerators.map((pg, index) => <motion.div
        key={pg.id}
        layout="position"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
      ><PromptGeneratorForm index={index} /></motion.div>)}
    </AnimatePresence>
  </div>;
}
