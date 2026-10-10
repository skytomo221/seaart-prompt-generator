import { TinyColor } from "@ctrl/tinycolor";
import { Button, FormGroup, InputGroup, Popover } from "@blueprintjs/core";
import { HexColorPicker } from "react-colorful";
import { useEffect, useState } from "react";

interface ColorInputProps { label: string; value: string; onChange: (value: string) => void; }

export default function ColorInput({ label, value, onChange }: ColorInputProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const parsed = new TinyColor(value);
  const pickerColor = parsed.isValid ? parsed.toHexString() : "#000000";
  const commit = () => {
    if (draft === "") { onChange(""); return; }
    if (new TinyColor(draft).isValid) onChange(draft);
    else setDraft(value);
  };
  const pickColor = (hex: string) => { setDraft(hex); onChange(hex); };
  const colorStyle = parsed.isValid ? { backgroundColor: parsed.toRgbString() } : undefined;
  return <FormGroup label={label} className="color-input">
    <Popover placement="bottom-start" content={<div className="color-input-popover">
      <HexColorPicker color={pickerColor} onChange={pickColor} />
      <InputGroup value={draft} aria-label={label} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") { commit(); event.currentTarget.blur(); } }} />
    </div>}>
      <Button className="color-input-trigger" variant="outlined" size="small" aria-label={label}>
        <span className="color-input-swatch" style={colorStyle} />
        <span>{value || "色を選択"}</span>
      </Button>
    </Popover>
  </FormGroup>;
}
