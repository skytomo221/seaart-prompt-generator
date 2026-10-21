import { Button, ButtonGroup } from "@blueprintjs/core";
import AttributeGraph from "./AttributeGraph";
import { useRef, useState } from "react";
import { Attribute, Data } from "./data";
import { v4 as uuid } from "uuid";
import AttributeList from "./AttributeList";
import AttributeEditor from "./AttributeEditor";
import { getDeletionReferences } from "./domain/references";
export default function AttributesTab({
  data,
  onChange,
  selectedId,
  onSelect,
  onError,
}: {
  data: Data;
  onChange: (d: Data) => void;
  selectedId: string;
  onSelect: (id: string) => void;
  onError: (message: string) => void;
}) {
  const [view, setView] = useState<"list" | "graph">("list");
  const scroll = useRef(0);
  const add = (at: number) => {
    const a: Attribute = { id: uuid(), name: "新しい属性", implies: [] };
    onChange({
      ...data,
      attributes: [
        ...data.attributes.slice(0, at),
        a,
        ...data.attributes.slice(at),
      ],
    });
    onSelect(a.id);
  };
  const selected = data.attributes.find((a) => a.id === selectedId);
  return (
    <div className="attributes-tab">
      <ButtonGroup aria-label="属性の表示">
        <Button active={view === "list"} onClick={() => setView("list")}>
          一覧
        </Button>
        <Button active={view === "graph"} onClick={() => setView("graph")}>
          関係図
        </Button>
      </ButtonGroup>
      <div
        className={`tab-content editor-tab-content ${view === "graph" ? "attribute-graph-view" : ""}`}
      >
        {view === "graph" ? (
          <AttributeGraph
            attributes={data.attributes}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ) : (
          <AttributeList
            items={data.attributes}
            selectedId={selectedId}
            onSelect={onSelect}
            onAdd={add}
            scrollTopRef={scroll}
            onReorder={(items) =>
              onChange({
                ...data,
                attributes: items.map((i) =>
                  data.attributes.find((a) => a.id === i.id)!,
                ),
              })
            }
          />
        )}
        <div className="editor-detail-pane">
          {selected ? (
            <AttributeEditor
              attribute={selected}
              data={data}
              onDataChange={onChange}
              onDelete={() => {
                const refs = getDeletionReferences(
                  "attribute",
                  selected.id,
                  data,
                  { schemaVersion: 2, promptGenerators: [] },
                );
                if (refs.length)
                  onError(`削除できません。参照元:\n${refs.join("\n")}`);
                else {
                  onError("");
                  onChange({
                    ...data,
                    attributes: data.attributes.filter(
                      (x) => x.id !== selected.id,
                    ),
                  });
                  onSelect("");
                }
              }}
            />
          ) : (
            <div className="editor-empty-state">属性を選択してください</div>
          )}
        </div>
      </div>
    </div>
  );
}
