import { Attribute, Data, Id } from "../data";

export function getAttributeChildren(attributes: Attribute[], parentId: Id) {
  return attributes.filter((attribute) => attribute.implies.includes(parentId));
}

// Stored edges point from child to parent. Adding child -> parent is safe
// only when following the parent's ancestors cannot reach the child.
export function canAddAttributeParent(
  attributes: Attribute[],
  childId: Id,
  parentId: Id,
): boolean {
  const byId = new Map(
    attributes.map((attribute) => [attribute.id, attribute]),
  );
  if (!byId.has(childId) || !byId.has(parentId)) return false;
  const pending = [parentId];
  const visited = new Set<Id>();
  while (pending.length) {
    const id = pending.pop()!;
    if (id === childId) return false;
    if (visited.has(id)) continue;
    visited.add(id);
    pending.push(...(byId.get(id)?.implies ?? []));
  }
  return true;
}

function setRelations(
  data: Data,
  edgesToRemove: (child: Attribute, parentId: Id) => boolean,
  additions: [Id, Id][],
): Data {
  let attributes = data.attributes.map((child) => ({
    ...child,
    implies: child.implies.filter(
      (parentId) => !edgesToRemove(child, parentId),
    ),
  }));
  for (const [childId, parentId] of additions) {
    if (!canAddAttributeParent(attributes, childId, parentId)) {
      throw new Error("自分自身または循環する親子関係は設定できません。");
    }
    attributes = attributes.map((child) =>
      child.id === childId && !child.implies.includes(parentId)
        ? { ...child, implies: [...child.implies, parentId] }
        : child,
    );
  }
  return { ...data, attributes };
}

export function setAttributeParents(
  data: Data,
  childId: Id,
  parentIds: Id[],
): Data {
  return setRelations(
    data,
    (child) => child.id === childId,
    [...new Set(parentIds)].map((parentId) => [childId, parentId]),
  );
}

export function setAttributeChildren(
  data: Data,
  parentId: Id,
  childIds: Id[],
): Data {
  return setRelations(
    data,
    (_child, id) => id === parentId,
    [...new Set(childIds)].map((childId) => [childId, parentId]),
  );
}
