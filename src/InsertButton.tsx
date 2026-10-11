import { Button } from "@blueprintjs/core";
import { useEffect, useRef, useState } from "react";

type Props = { onClick: () => void; ariaLabel: string };

export default function InsertButton({ onClick, ariaLabel }: Props) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | undefined>();
  useEffect(() => () => clearTimeout(timeoutRef.current), []);
  const handleMouseEnter = () => { clearTimeout(timeoutRef.current); timeoutRef.current = window.setTimeout(() => setVisible(true), 300); };
  const handleMouseLeave = () => { clearTimeout(timeoutRef.current); setVisible(false); };
  return <div className="insert-button-area" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
    <div className={`insert-button-line${visible ? " is-visible" : ""}`} />
    {visible && <Button className="insert-button-control" icon="add" size="small" intent="success" aria-label={ariaLabel} onClick={onClick} />}
  </div>;
}
