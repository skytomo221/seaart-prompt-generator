import { Button } from "@blueprintjs/core";
import { useEffect, useRef, useState } from "react";
export default function InsertButton({ onClick, ariaLabel }: { onClick: () => void; ariaLabel: string }) {
  const [visible, setVisible] = useState(false); const timer = useRef<number>();
  useEffect(() => () => clearTimeout(timer.current), []);
  return <div className="insert-button-area" onMouseEnter={() => { clearTimeout(timer.current); timer.current = window.setTimeout(() => setVisible(true), 300); }} onMouseLeave={() => { clearTimeout(timer.current); setVisible(false); }}><div className={`insert-button-line${visible ? " is-visible" : ""}`} />{visible && <Button className="insert-button-control" icon="add" size="small" intent="success" aria-label={ariaLabel} onClick={onClick} />}</div>;
}
