import type { Conjunction } from '@ryanmakes/eb_engine';
import type { QueryDocument, QueryGroup, QueryNode, QueryRule, RulePatch } from './querySchema';

type VisitResult = {
  node?: QueryNode;
  removed?: QueryNode;
  changed: boolean;
};

const defaultRule = (id: string): QueryRule => ({
  id,
  kind: 'rule',
  fieldId: '',
  operator: 'equals',
  value: '',
});

const defaultGroup = (id: string): QueryGroup => ({
  id,
  kind: 'group',
  conjunction: 'and',
  children: [],
});

const collectIds = (node: QueryNode, ids = new Set<string>()): Set<string> => {
  ids.add(node.id);

  if (node.kind === 'group') {
    for (const child of node.children) {
      collectIds(child, ids);
    }
  }

  return ids;
};

const nextId = (document: QueryDocument, prefix: string): string => {
  const ids = collectIds(document.root);
  let index = 1;
  let id = `${prefix}-${index}`;

  while (ids.has(id)) {
    index += 1;
    id = `${prefix}-${index}`;
  }

  return id;
};

const containsNode = (node: QueryNode, nodeId: string): boolean => {
  if (node.id === nodeId) {
    return true;
  }

  return node.kind === 'group' && node.children.some((child) => containsNode(child, nodeId));
};

const findRule = (node: QueryNode, ruleId: string): QueryRule | undefined => {
  if (node.kind === 'rule') {
    return node.id === ruleId ? node : undefined;
  }

  for (const child of node.children) {
    const match = findRule(child, ruleId);

    if (match) {
      return match;
    }
  }

  return undefined;
};

const findParentGroupId = (node: QueryNode, ruleId: string): string | undefined => {
  if (node.kind === 'rule') {
    return undefined;
  }

  for (const child of node.children) {
    if (child.id === ruleId) {
      return node.id;
    }
    const nested = findParentGroupId(child, ruleId);
    if (nested) {
      return nested;
    }
  }

  return undefined;
};

const addChildToGroup = (
  group: QueryGroup,
  parentGroupId: string,
  child: QueryNode,
  index = group.children.length,
): QueryGroup => {
  if (group.id === parentGroupId) {
    const insertionIndex = Math.max(0, Math.min(index, group.children.length));
    return {
      ...group,
      children: [
        ...group.children.slice(0, insertionIndex),
        child,
        ...group.children.slice(insertionIndex),
      ],
    };
  }

  let changed = false;
  const children = group.children.map((current) => {
    if (current.kind === 'rule') {
      return current;
    }

    const next = addChildToGroup(current, parentGroupId, child, index);
    changed ||= next !== current;
    return next;
  });

  return changed ? { ...group, children } : group;
};

const updateRuleInNode = (node: QueryNode, ruleId: string, patch: RulePatch): QueryNode => {
  if (node.kind === 'rule') {
    return node.id === ruleId ? { ...node, ...patch } : node;
  }

  let changed = false;
  const children = node.children.map((child) => {
    const next = updateRuleInNode(child, ruleId, patch);
    changed ||= next !== child;
    return next;
  });

  return changed ? { ...node, children } : node;
};

const duplicateRuleInNode = (
  node: QueryNode,
  ruleId: string,
  newRuleId: string,
): { node: QueryNode; duplicated?: QueryRule } => {
  if (node.kind === 'rule') {
    return { node };
  }

  let duplicated: QueryRule | undefined;
  let changed = false;
  const children: QueryNode[] = [];

  for (const child of node.children) {
    if (child.kind === 'rule' && child.id === ruleId) {
      duplicated = { ...child, id: newRuleId };
      children.push(child, duplicated);
      changed = true;
      continue;
    }

    const result = duplicateRuleInNode(child, ruleId, newRuleId);
    duplicated ??= result.duplicated;
    changed ||= result.node !== child;
    children.push(result.node);
  }

  return {
    node: changed ? { ...node, children } : node,
    duplicated,
  };
};

const removeNode = (node: QueryNode, nodeId: string): VisitResult => {
  if (node.id === nodeId) {
    return { removed: node, changed: true };
  }

  if (node.kind === 'rule') {
    return { node, changed: false };
  }

  let removed: QueryNode | undefined;
  let changed = false;
  const children: QueryNode[] = [];

  for (const child of node.children) {
    const result = removeNode(child, nodeId);
    removed ??= result.removed;
    changed ||= result.changed;

    if (result.node) {
      children.push(result.node);
    }
  }

  return {
    node: changed ? { ...node, children } : node,
    removed,
    changed,
  };
};

const changeConjunctionInNode = (
  node: QueryNode,
  groupId: string,
  conjunction: Conjunction,
): QueryNode => {
  if (node.kind === 'rule') {
    return node;
  }

  if (node.id === groupId) {
    return node.conjunction === conjunction ? node : { ...node, conjunction };
  }

  let changed = false;
  const children = node.children.map((child) => {
    const next = changeConjunctionInNode(child, groupId, conjunction);
    changed ||= next !== child;
    return next;
  });

  return changed ? { ...node, children } : node;
};

export const addRule = (
  document: QueryDocument,
  parentGroupId: string,
  rule: Partial<QueryRule> = {},
): QueryDocument => {
  const newRule = { ...defaultRule(nextId(document, 'rule')), ...rule, kind: 'rule' as const };
  const root = addChildToGroup(document.root, parentGroupId, newRule);

  return root === document.root
    ? document
    : { ...document, root, selectedRuleId: newRule.id, activeGroupId: parentGroupId };
};

export const addGroup = (
  document: QueryDocument,
  parentGroupId: string,
  group: Partial<QueryGroup> = {},
): QueryDocument => {
  const newGroup = { ...defaultGroup(nextId(document, 'group')), ...group, kind: 'group' as const };
  const root = addChildToGroup(document.root, parentGroupId, newGroup);

  return root === document.root ? document : { ...document, root, activeGroupId: newGroup.id };
};

export const updateRule = (
  document: QueryDocument,
  ruleId: string,
  patch: RulePatch,
): QueryDocument => {
  const root = updateRuleInNode(document.root, ruleId, patch) as QueryGroup;

  return root === document.root ? document : { ...document, root, selectedRuleId: ruleId };
};

export const duplicateRule = (document: QueryDocument, ruleId: string): QueryDocument => {
  const newRuleId = nextId(document, `${ruleId}-copy`);
  const result = duplicateRuleInNode(document.root, ruleId, newRuleId);

  return result.node === document.root
    ? document
    : { ...document, root: result.node as QueryGroup, selectedRuleId: result.duplicated?.id };
};

export const deleteNode = (document: QueryDocument, nodeId: string): QueryDocument => {
  if (document.root.id === nodeId) {
    return document;
  }

  const result = removeNode(document.root, nodeId);

  if (!result.node || result.node === document.root) {
    return document;
  }

  const selectedRuleId =
    document.selectedRuleId && containsNode(result.node, document.selectedRuleId)
      ? document.selectedRuleId
      : undefined;
  const activeGroupId =
    document.activeGroupId && containsNode(result.node, document.activeGroupId)
      ? document.activeGroupId
      : undefined;

  return { ...document, root: result.node as QueryGroup, selectedRuleId, activeGroupId };
};

export const selectRule = (document: QueryDocument, ruleId?: string): QueryDocument => {
  if (!ruleId) {
    return { ...document, selectedRuleId: undefined };
  }

  if (!findRule(document.root, ruleId)) {
    return document;
  }

  const activeGroupId = findParentGroupId(document.root, ruleId) ?? document.activeGroupId;
  return { ...document, selectedRuleId: ruleId, activeGroupId };
};

/** Focuses a group as the target for new rules/groups/fields (T-focus-group). */
export const focusGroup = (document: QueryDocument, groupId: string): QueryDocument => {
  return containsNode(document.root, groupId) ? { ...document, activeGroupId: groupId } : document;
};

export const moveNode = (
  document: QueryDocument,
  nodeId: string,
  targetGroupId: string,
  targetIndex?: number,
): QueryDocument => {
  if (document.root.id === nodeId || nodeId === targetGroupId) {
    return document;
  }

  const removal = removeNode(document.root, nodeId);

  if (!removal.node || !removal.removed) {
    return document;
  }

  if (removal.removed.kind === 'group' && containsNode(removal.removed, targetGroupId)) {
    return document;
  }

  const root = addChildToGroup(
    removal.node as QueryGroup,
    targetGroupId,
    removal.removed,
    targetIndex,
  );

  return root === removal.node ? document : { ...document, root };
};

export const clearDocument = (document: QueryDocument): QueryDocument => {
  if (document.root.children.length === 0) return document;
  return {
    ...document,
    root: { ...document.root, children: [] },
    selectedRuleId: undefined,
    activeGroupId: undefined,
  };
};

export const changeGroupConjunction = (
  document: QueryDocument,
  groupId: string,
  conjunction: Conjunction,
): QueryDocument => {
  const root = changeConjunctionInNode(document.root, groupId, conjunction) as QueryGroup;

  return root === document.root ? document : { ...document, root };
};
