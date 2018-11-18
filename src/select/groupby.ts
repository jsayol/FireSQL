import { SQL_GroupBy } from 'node-sqlparser';
import { assert, safeGet, contains, DocumentData, ValueOf } from '../utils';

export function applyGroupByLocally(
  documents: DocumentData[],
  astGroupBy: SQL_GroupBy[]
): GroupedDocuments {
  assert(astGroupBy.length > 0, 'GROUP BY needs at least 1 group.');

  let group: ValueOf<GroupedDocuments> = new DocumentsGroup();
  group.documents = documents;

  astGroupBy.forEach(groupBy => {
    assert(
      groupBy.type === 'column_ref',
      'GROUP BY only supports grouping by field names.'
    );
    group = applySingleGroupBy(group, groupBy);
  });

  return (group as any) as GroupedDocuments;
}

function applySingleGroupBy(
  documents: ValueOf<GroupedDocuments>,
  groupBy: SQL_GroupBy
): GroupedDocuments {
  const groupedDocs: GroupedDocuments = {};

  if (documents instanceof DocumentsGroup) {
    // We just have a list of documents
    const numDocs = documents.documents.length;

    for (let i = 0; i < numDocs; i++) {
      const doc = documents.documents[i];

      // Since we're going to use the value as an object key, always
      // coherce it to a string in case it's some other type.
      const groupValue = String(safeGet(doc, groupBy.column));

      if (!contains(groupedDocs, groupValue)) {
        groupedDocs[groupValue] = new DocumentsGroup();
      }

      (groupedDocs[groupValue] as DocumentsGroup).documents.push(doc);
    }

    return groupedDocs;
  } else {
    // We have documents that have already been grouped with another field
    const currentGroups = Object.keys(documents);
    currentGroups.forEach(group => {
      groupedDocs[group] = applySingleGroupBy(documents[group], groupBy);
    });
    return groupedDocs;
  }
}

export class DocumentsGroup {
  documents: DocumentData[] = [];
  aggr: GroupAggregateValues = {
    sum: {},
    avg: {},
    min: {},
    max: {},
    total: {}
  };

  constructor(public key?: string) {}
}

export interface GroupedDocuments {
  [key: string]: GroupedDocuments | DocumentsGroup;
}

export interface GroupAggregateValues {
  sum: { [k: string]: number };
  avg: { [k: string]: number };
  min: { [k: string]: number | string };
  max: { [k: string]: number | string };
  total: { [k: string]: number };
}
