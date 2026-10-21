import { Attribute } from "../data";
import { Edge, Node, Position } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";

export function createAttributeGraph(attributes: Attribute[]) {
  const ids = new Set(attributes.map((attribute) => attribute.id));
  const nodes: Node[] = attributes.map((attribute, index) => ({
    id: attribute.id,
    data: { label: attribute.name },
    position: { x: (index % 4) * 240, y: Math.floor(index / 4) * 120 },
    style: { width: 200, height: 72, overflow: "auto" },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  }));
  const edges: Edge[] = attributes.flatMap((child) =>
    [...new Set(child.implies)]
      .filter((id) => ids.has(id))
      .map((parentId) => ({
        id: JSON.stringify([parentId, child.id]),
        source: parentId,
        target: child.id,
      })),
  );
  return { nodes, edges };
}

const elk = new ELK();
export async function layoutAttributeGraph(
  graph: ReturnType<typeof createAttributeGraph>,
) {
  const result = await elk.layout({
    id: "attributes",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "60",
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
    },
    children: graph.nodes.map((node) => ({
      id: node.id,
      width: 200,
      height: 72,
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  });
  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      const positioned = result.children?.find((child) => child.id === node.id);
      return {
        ...node,
        position: {
          x: positioned?.x ?? node.position.x,
          y: positioned?.y ?? node.position.y,
        },
      };
    }),
  };
}
