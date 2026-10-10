import { Button } from "@blueprintjs/core";
import { useRef, useState } from "react";

export default function InsertButton({ onClick }: { onClick: () => void }) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | undefined>();
  const handleMouseEnter = () => { timeoutRef.current = window.setTimeout(() => setVisible(true), 300); };
  const handleMouseLeave = () => { clearTimeout(timeoutRef.current); setVisible(false); };
  return <div className="insert-button-area" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
    <div className={`insert-button-line${visible ? " is-visible" : ""}`} />
    {visible && <Button className="insert-button-control" icon="add" size="small" intent="success" aria-label="insert keyword" onClick={onClick} />}
  </div>;
}
