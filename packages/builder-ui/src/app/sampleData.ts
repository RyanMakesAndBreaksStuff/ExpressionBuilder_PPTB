import type { QueryDocument } from '../composer/querySchema';

export const emptyStarterDocument: QueryDocument = {
  version: 1,
  mode: 'triggerCondition',
  fields: [],
  root: {
    id: 'root',
    kind: 'group',
    conjunction: 'and',
    children: [],
  },
};

export const sampleFields: QueryDocument['fields'] = [
  {
    id: 'Status',
    label: 'Status',
    type: 'choice',
    path: ['Status'],
    choices: ['Approved', 'Rejected', 'Pending'],
    source: 'sample',
  },
  { id: 'Approver', label: 'Approver', type: 'string', path: ['Approver'], nullable: true, source: 'sample' },
  { id: 'Amount', label: 'Amount', type: 'number', path: ['Amount'], source: 'sample' },
  { id: 'Region', label: 'Region', type: 'choice', path: ['Region'], choices: ['EMEA', 'APAC', 'AMER'], source: 'sample' },
  { id: 'DueDate', label: 'Due date', type: 'dateTime', path: ['DueDate'], source: 'sample' },
  { id: 'Submitted', label: 'Submitted', type: 'boolean', path: ['Submitted'], source: 'sample' },
  { id: 'RequestId', label: 'Request ID', type: 'string', path: ['RequestId'], source: 'sample' },
  { id: 'Department', label: 'Department', type: 'string', path: ['Department'], source: 'sample' },
];

export const sampleDocument: QueryDocument = {
  version: 1,
  mode: 'triggerCondition',
  fields: sampleFields,
  selectedRuleId: 'rule-status',
  root: {
    id: 'root',
    kind: 'group',
    conjunction: 'and',
    children: [
      {
        id: 'rule-status',
        kind: 'rule',
        fieldId: 'Status',
        operator: 'equals',
        value: 'Approved',
      },
      {
        id: 'rule-approver',
        kind: 'rule',
        fieldId: 'Approver',
        operator: 'contains',
        value: 'finance',
      },
      {
        id: 'group-routing',
        kind: 'group',
        conjunction: 'or',
        children: [
          {
            id: 'rule-region-emea',
            kind: 'rule',
            fieldId: 'Region',
            operator: 'equals',
            value: 'EMEA',
          },
          {
            id: 'rule-amount',
            kind: 'rule',
            fieldId: 'Amount',
            operator: 'greater',
            value: 5000,
          },
        ],
      },
    ],
  },
};
  },
};
