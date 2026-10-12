import { Button } from "@blueprintjs/core";
import { AnimatePresence, motion } from "framer-motion";
import { v4 as uuid } from "uuid";
import { Data, PromptGenerator } from "./data";
import PromptGeneratorForm from "./PromptGeneratorForm";
import { ResultCopyStatusProvider } from "./ResultText";

export default function PromptGeneratorsTab({ data, generators, onChange }: { data: Data; generators: PromptGenerator[]; onChange: (generators: PromptGenerator[]) => void }) {
  const add = () => onChange([...generators, { id: uuid(), presetSlots: [] }]);
  const clone = (source: number, at: number) => {
    const original = generators[source];
    if (!original) return;
    const copy = { id: uuid(), presetSlots: original.presetSlots.map(s => ({ ...s, id: uuid() })) };
    onChange([...generators.slice(0, at), copy, ...generators.slice(at)]);
  };
  const change = (g: PromptGenerator) => onChange(generators.map(x => x.id === g.id ? g : x));
  const remove = (id: string) => onChange(generators.filter(x => x.id !== id));

  return <ResultCopyStatusProvider>
    <div className="prompt-generators-tab">
      <AnimatePresence initial={false}>
        {generators.map((g, i) => <motion.div key={g.id} layout>
          <PromptGeneratorForm generator={g} index={i} data={data} onChange={change} onClone={clone} onDelete={() => remove(g.id)} />
        </motion.div>)}
      </AnimatePresence>
      <Button icon="add" variant="outlined" onClick={add}>生成フォーム追加</Button>
    </div>
  </ResultCopyStatusProvider>;
}
