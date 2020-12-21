import * as t from 'io-ts';

const forwardRuleSpecType = t.type({
  destination: t.string,
});
export type ForwardRuleSpec = t.TypeOf<typeof forwardRuleSpecType>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ForwardRuleSpecEx = ForwardRuleSpec & {[others: string]: any};

export const ForwardRuleSpecReservedWords = new Set<string>([
  'destination',
  'id',
  'source',
]);

const nodeSpecType = t.type({
  name: t.string,
  key: t.string,
  rules: t.array(forwardRuleSpecType),
});
export type NodeSpec = t.TypeOf<typeof nodeSpecType>;

// TODO: consider option to represent edges in graph spec.
// This would allow one to save routes for later analysis.

const graphSpecType = t.type({
  nodes: t.array(nodeSpecType),
});
export type GraphSpec = t.TypeOf<typeof graphSpecType>;
