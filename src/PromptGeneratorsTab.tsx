import PromptGeneratorForm from "./PromptGeneratorForm";
import { motion, AnimatePresence } from "framer-motion";
import { usePromptGeneratorsStore } from "./contexts/promptGeneratorsContext";
import { MutableRefObject, useLayoutEffect, useRef } from "react";

export default function PromptGeneratorsTab({ scrollLeftRef }: { scrollLeftRef: MutableRefObject<number> }) {
  const promptGenerators = usePromptGeneratorsStore();
  const tabRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (tabRef.current) tabRef.current.scrollLeft = scrollLeftRef.current;
  }, [scrollLeftRef]);
  return <div ref={tabRef} className="prompt-generators-tab" onScroll={(event) => { scrollLeftRef.current = event.currentTarget.scrollLeft; }}>
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
