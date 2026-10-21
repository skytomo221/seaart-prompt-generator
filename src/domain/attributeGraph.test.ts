import { expect, it } from "vitest";
import { createAttributeGraph, layoutAttributeGraph } from "./attributeGraph";
const attributes = [
  { id: "a", name: "人物", implies: [] },
  { id: "b", name: "女性", implies: ["a"] },
  { id: "c", name: "教師", implies: ["a"] },
  { id: "d", name: "女性教師", implies: ["b", "c"] },
];
it("creates named nodes and parent-to-child edges including multiple parents", () => {
  const graph = createAttributeGraph(attributes);
  expect(graph.nodes.map((node) => [node.id, node.data.label])).toEqual(
    attributes.map((a) => [a.id, a.name]),
  );
  expect(graph.edges.map(({ source, target }) => [source, target])).toEqual([
    ["a", "b"],
    ["a", "c"],
    ["b", "d"],
    ["c", "d"],
  ]);
});
it("lays out parents above children with distinct node positions", async () => {
  const graph = await layoutAttributeGraph(createAttributeGraph(attributes));
  for (const edge of graph.edges) {
    expect(
      graph.nodes.find((n) => n.id === edge.source)!.position.y,
    ).toBeLessThan(graph.nodes.find((n) => n.id === edge.target)!.position.y);
  }
  expect(new Set(graph.nodes.map((n) => JSON.stringify(n.position))).size).toBe(
    attributes.length,
  );
});
