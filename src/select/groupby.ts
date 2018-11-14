import { ASTGroupBy } from 'node-sqlparser';
import { assert, safeGet } from '../utils';

export function applyGroupByLocally(
  documents: DocumentData[],
  astGroupBy: ASTGroupBy[]
): MaybeGroupedDocuments {
  let groupedDocs: MaybeGroupedDocuments = documents;

  astGroupBy.forEach(groupBy => {
    assert(
      groupBy.type === 'column_ref',
      'GROUP BY only supports grouping by field names.'
    );
    groupedDocs = applySingleGroupBy(groupedDocs, groupBy);
  });

  // FIXME !!!
  return documents;
}

function applySingleGroupBy(
  documents: MaybeGroupedDocuments,
  groupBy: ASTGroupBy
): GroupedDocuments<GroupedDocuments<any> | DocumentData[]> {
  if (!Array.isArray(documents)) {
    // We have documents that have already been grouped with another field
    const groupedDocs: GroupedDocuments<GroupedDocuments<any>> = {};
    const groups = Object.keys(documents);
    groups.forEach(group => {
      groupedDocs[group] = applySingleGroupBy(documents[group], groupBy);
    });
    return groupedDocs;
  } else {
    // We just have a list of documents
    const groupedDocs: GroupedDocuments<DocumentData[]> = {};
    const numDocs = documents.length;

    for (let i = 0; i < numDocs; i++) {
      const doc = documents[i];
      const groupValue = safeGet(doc, groupBy.column);

      if (typeof groupedDocs[groupValue] === 'undefined') {
        groupedDocs[groupValue] = [];
      }

      groupedDocs[groupValue].push(doc);
    }

    return groupedDocs;
  }
}

type DocumentData = firebase.firestore.DocumentData;

interface GroupedDocuments<T> {
  [value: string]: T;
}

export type MaybeGroupedDocuments =
  | GroupedDocuments<GroupedDocuments<any>>
  | GroupedDocuments<DocumentData[]>
  | DocumentData[];
