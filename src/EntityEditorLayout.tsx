import { Button } from "@blueprintjs/core";
import { ReactNode, useEffect, useState } from "react";

interface Props {
  entityId: string;
  deleteLabel: string;
  onDelete: () => void;
  renderView: () => ReactNode;
  renderEdit: (showDangerous: boolean) => ReactNode;
}

export default function EntityEditorLayout({
  entityId,
  deleteLabel,
  onDelete,
  renderView,
  renderEdit,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDangerous, setShowDangerous] = useState(false);

  useEffect(() => {
    setIsEditing(false);
    setShowDangerous(false);
  }, [entityId]);

  const toggleEditing = () => {
    setIsEditing((current) => {
      if (current) setShowDangerous(false);
      return !current;
    });
  };

  return (
    <div className="detail-form">
      <div className="detail-editor-toolbar">
        <Button icon={isEditing ? "tick" : "edit"} onClick={toggleEditing}>
          {isEditing ? "編集を終了" : "編集する"}
        </Button>
      </div>

      {isEditing ? (
        <div className="detail-editor-fields">{renderEdit(showDangerous)}</div>
      ) : (
        <div className="detail-view-fields">{renderView()}</div>
      )}

      {isEditing && (
        <details
          key={entityId}
          className="danger-zone"
          open={showDangerous}
          onToggle={(event) => setShowDangerous(event.currentTarget.open)}
        >
          <summary>危険な操作</summary>
          <div className="danger-zone-content">
            <Button intent="danger" onClick={onDelete}>
              {deleteLabel}
            </Button>
          </div>
        </details>
      )}
    </div>
  );
}
