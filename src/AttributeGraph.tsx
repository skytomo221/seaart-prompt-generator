import { useEffect, useState } from "react";
import { Background, Controls, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Attribute } from "./data";
import {
  createAttributeGraph,
  layoutAttributeGraph,
} from "./domain/attributeGraph";

export default function AttributeGraph({
  attributes,
  selectedId,
  onSelect,
}: {
  attributes: Attribute[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [graph, setGraph] = useState(() => createAttributeGraph(attributes));
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [layoutError, setLayoutError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const next = createAttributeGraph(attributes);
    setGraph(next);
    setLayoutError(false);
    layoutAttributeGraph(next)
      .then((laidOut) => {
        if (!cancelled) {
          setGraph(laidOut);
          setLayoutVersion((value) => value + 1);
        }
      })
      .catch(() => {
        if (!cancelled) setLayoutError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attributes]);
  if (!attributes.length)
    return <div className="editor-empty-state">属性がありません</div>;
  return (
    <div className="attribute-graph">
      {layoutError && (
        <div role="status">
          自動配置に失敗しました。簡易配置で表示しています。
        </div>
      )}
      <ReactFlow
        key={layoutVersion}
        nodes={graph.nodes.map((node) => ({
          ...node,
          selected: node.id === selectedId,
        }))}
        edges={graph.edges}
        onNodeClick={(_event, node) => onSelect(node.id)}
        nodesConnectable={false}
        nodesDraggable={false}
        edgesReconnectable={false}
        fitView
        minZoom={0.1}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
