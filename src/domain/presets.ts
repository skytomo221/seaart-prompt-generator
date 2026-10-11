import { Data, Id, Preset } from "../data";

export function findPreset(data: Data, presetId: Id): { concept: Data["concepts"][number]; preset: Preset } | undefined {
  for (const concept of data.concepts) {
    const preset = concept.presets.find(item => item.id === presetId);
    if (preset) return { concept, preset };
  }
}

export function allPresets(data: Data): Array<{ concept: Data["concepts"][number]; preset: Preset }> {
  return data.concepts.flatMap(concept => concept.presets.map(preset => ({ concept, preset })));
}
