import {
  SQL_AST,
  SQL_SelectColumn,
  SQL_ColumnRef,
  SQL_AggrFunction
} from 'node-sqlparser';
import {
  assert,
  contains,
  deepGet,
  DocumentData,
  safeGet,
  nameOrAlias
} from '../utils';
import {
  applyGroupByLocally,
  GroupedDocuments,
  GroupAggregateValues,
  DocumentsGroup
} from './groupby';
import { applyOrderBy, applyOrderByLocally } from './orderby';
import { applyLimit, applyLimitLocally } from './limit';
import { applyWhere } from './where';

export async function select(
  ref: firebase.firestore.DocumentReference,
  ast: SQL_AST
): Promise<DocumentData[]> {
  const queries = generateQueries(ref, ast);
  const documents = await executeQueries(queries);
  return processDocuments(ast, queries, documents);
}

export function generateQueries(
  ref: firebase.firestore.DocumentReference,
  ast: SQL_AST
): firebase.firestore.Query[] {
  assert(
    ast.from.length === 1,
    'Only one collection at a time (no JOINs yet).'
  );

  const colName = ast.from[0].table;
  let collection = ref.collection(colName);
  let queries: firebase.firestore.Query[] = [collection];

  /*
 * We'd need this if we end up implementing JOINs, but for now
 * it's unnecessary since we're only querying a single collection
 
  // Keep track of aliased "tables" (collections)
  const aliasedCollections: { [k: string]: string } = {};
  if (ast.from[0].as.length > 0) {
    aliasedCollections[ast.from[0].as] = colName;
  } else {
    aliasedCollections[colName] = colName;
  }
 */

  if (ast.where) {
    queries = applyWhere(queries, ast.where);
  }

  if (ast.orderby) {
    queries = applyOrderBy(queries, ast.orderby);

    /*
     FIXME: the following query throws an error:
        SELECT city, name
        FROM restaurants
        WHERE city IN ('Nashvile', 'Denver')
        ORDER BY city, name

     It happens because "WHERE ... IN ..." splits into 2 separate
     queries with a "==" filter, and an order by clause cannot
     contain a field with an equality filter:
        ...where("city","==","Denver").orderBy("city")
    */
  }

  // if (ast.groupby) {
  //   throw new Error('GROUP BY not supported yet');
  // }

  if (ast.limit) {
    // First we apply the limit to each query we may have
    // and later we'll apply it again locally to the
    // merged set of documents, in case we end up with too many.
    queries = applyLimit(queries, ast.limit);
  }

  if (ast._next) {
    assert(
      ast._next.type === 'select',
      ' UNION statements are only supported between SELECTs.'
    );
    // This is the UNION of 2 SELECTs, so lets process the second
    // one and merge their queries
    queries = queries.concat(generateQueries(ref, ast._next));

    // FIXME: The SQL parser incorrectly attributes ORDER BY to the second
    // SELECT only, instead of to the whole UNION. Find a workaround.
  }

  return queries;
}

async function executeQueries(
  queries: firebase.firestore.Query[]
): Promise<DocumentData[]> {
  let documents: DocumentData[] = [];
  const seenDocs: { [id: string]: true } = {};

  try {
    await Promise.all(
      queries.map(async query => {
        const snapshot = await query.get();
        const numDocs = snapshot.docs.length;

        for (let i = 0; i < numDocs; i++) {
          const doc = snapshot.docs[i];
          if (!contains(seenDocs, doc.ref.path)) {
            documents.push(doc.data());
            seenDocs[doc.ref.path] = true;
          }
        }
      })
    );
  } catch (err) {
    // TODO: handle error?
    throw err;
  }

  return documents;
}

export function processDocuments(
  ast: SQL_AST,
  queries: firebase.firestore.Query[],
  documents: DocumentData[]
): DocumentData[] {
  if (documents.length === 0) {
    return [];
  } else {
    if (ast.groupby) {
      const groupedDocs = applyGroupByLocally(documents, ast.groupby);
      return processGroupedDocs(ast, queries, groupedDocs);
    } else {
      return processUngroupedDocs(ast, queries, documents);
    }
  }
}

function processUngroupedDocs(
  ast: SQL_AST,
  queries: firebase.firestore.Query[],
  documents: DocumentData[]
): DocumentData[] {
  if (ast.orderby && queries.length > 1) {
    // We merged more than one query into a single set of documents
    // so we need to order the documents again, this time client-side.
    documents = applyOrderByLocally(documents, ast.orderby);
  }

  if (ast.limit && queries.length > 1) {
    // We merged more than one query into a single set of documents
    // so we need to apply the limit again, this time client-side.
    documents = applyLimitLocally(documents, ast.limit);
  }

  if (typeof ast.columns === 'string' && ast.columns === '*') {
    // Return all fields from the documents
  } else if (Array.isArray(ast.columns)) {
    const aggrColumns = getAggrColumns(ast.columns);

    if (aggrColumns.length > 0) {
      const docsGroup = new DocumentsGroup();
      docsGroup.documents = documents;
      aggregateDocuments(docsGroup, aggrColumns);

      /// Since there is no GROUP BY and we already computed all
      // necessary aggregated values, at this point we only care
      // about the first document in the list. Anything else is
      // irrelevant.
      const resultEntry = buildResultEntry(
        docsGroup.documents[0],
        ast.columns,
        docsGroup.aggr
      );
      documents = [resultEntry];
    } else {
      documents = documents.map(doc => buildResultEntry(doc, ast.columns));
    }
  } else {
    // We should never reach here
    throw new Error('Internal error (ast.columns).');
  }

  return documents;
}

function processGroupedDocs(
  ast: SQL_AST,
  queries: firebase.firestore.Query[],
  groupedDocs: GroupedDocuments
): DocumentData[] {
  const aggrColumns = getAggrColumns(ast.columns);
  const groups = flattenGroupedDocs(groupedDocs);

  if (aggrColumns.length === 0) {
    // We're applying a GROUP BY but none of the fields requested
    // in the SELECT are an aggregate function. In this case we
    // just return an entry for the first document.
    const firstGroupKey = Object.keys(groups)[0];
    const firstGroup = groups[firstGroupKey];
    const firstDoc = firstGroup.documents[0];
    return [buildResultEntry(firstDoc, ast.columns)];
  } else {
    const results: DocumentData[] = [];

    // TODO: ORDER BY
    assert(!ast.orderby, 'ORDER BY is not yet supported when using GROUP BY.');

    // TODO: LIMIT
    assert(!ast.limit, 'ORDER BY is not yet supported when using GROUP BY.');

    Object.keys(groups).forEach(groupKey => {
      const docsGroup = groups[groupKey];
      aggregateDocuments(docsGroup, aggrColumns);

      const resultEntry = buildResultEntry(
        docsGroup.documents[0],
        ast.columns,
        docsGroup.aggr
      );

      results.push(resultEntry);
    });

    return results;
  }
}

function aggregateDocuments(
  docsGroup: DocumentsGroup,
  functions: SQL_AggrFunction[]
): DocumentsGroup {
  const numDocs = docsGroup.documents.length;

  for (let i = 0; i < numDocs; i++) {
    const doc = docsGroup.documents[i];

    // If the same field is used in more than one aggregate function
    // we don't want to sum its value more than once.
    const skipSum: { [field: string]: true } = {};

    functions.forEach(fn => {
      const column = (fn.args.expr as SQL_ColumnRef).column;
      let value = safeGet(doc, column);
      const isNumber = !Number.isNaN(value);

      switch (fn.name) {
        case 'AVG':
          // Lets put a value so that later we know we have to compute this avg
          docsGroup.aggr.avg[column] = 0;
        // tslint:disable-next-line:no-switch-case-fall-through
        case 'SUM':
          if (safeGet(skipSum, column) !== true) {
            skipSum[column] = true;
            if (!contains(docsGroup.aggr.total, column)) {
              docsGroup.aggr.total[column] = 0;
              docsGroup.aggr.sum[column] = 0;
            }
            value = Number(value);
            assert(
              !Number.isNaN(value),
              `Can't compute aggregate function ${
                fn.name
              }(${column}) because some values are not numbers.`
            );
            docsGroup.aggr.total[column] += 1;
            docsGroup.aggr.sum[column] += value;
            // FIXME: if the numbers are big we could easily go out of bounds in this sum
          }
          break;
        case 'MIN':
          assert(
            isNumber || typeof value === 'string',
            `Aggregate function MIN(${column}) can only be performed on numbers or strings`
          );
          if (!contains(docsGroup.aggr.min, column)) {
            docsGroup.aggr.min[column] = value;
          } else {
            if (!Number.isNaN(docsGroup.aggr.min[column] as any)) {
              // The current minimum is a number
              assert(
                isNumber,
                `Can't compute aggregate function MIN(${column}) because some values are not numbers.`
              );
              value = Number(value);
            }
            if (value < docsGroup.aggr.min[column]) {
              docsGroup.aggr.min[column] = value;
            }
          }
          break;
        case 'MAX':
          assert(
            isNumber || typeof value === 'string',
            `Aggregate function MAX(${column}) can only be performed on numbers or strings`
          );
          if (!contains(docsGroup.aggr.max, column)) {
            docsGroup.aggr.max[column] = value;
          } else {
            if (!Number.isNaN(docsGroup.aggr.max[column] as any)) {
              // The current maximum is a number
              assert(
                isNumber,
                `Can't compute aggregate function MAX(${column}) because some values are not numbers.`
              );
              value = Number(value);
            }
            if (value > docsGroup.aggr.max[column]) {
              docsGroup.aggr.max[column] = value;
            }
          }
          break;
      }
    });
  }

  // Compute any necessary averages
  Object.keys(docsGroup.aggr.avg).forEach(group => {
    docsGroup.aggr.avg[group] =
      docsGroup.aggr.sum[group] / docsGroup.aggr.total[group];
  });

  return docsGroup;
}

function getAggrColumns(columns: SQL_SelectColumn[]): SQL_AggrFunction[] {
  const aggrColumns: SQL_AggrFunction[] = [];

  columns.forEach(astColumn => {
    if (astColumn.expr.type === 'aggr_func') {
      vaidateAggrFunction(astColumn.expr);
      aggrColumns.push(astColumn.expr);
    } else {
      assert(
        astColumn.expr.type === 'column_ref',
        'Only field names and aggregate functions are supported in SELECT statements.'
      );
    }
  });

  return aggrColumns;
}

function buildResultEntry(
  document: DocumentData,
  columns: SQL_SelectColumn[],
  aggregate?: GroupAggregateValues,
  asFieldArray?: false
): DocumentData;

function buildResultEntry(
  document: DocumentData,
  columns: SQL_SelectColumn[],
  aggregate?: GroupAggregateValues,
  asFieldArray?: true
): AliasedField[];

function buildResultEntry(
  document: DocumentData,
  columns: SQL_SelectColumn[],
  aggregate?: GroupAggregateValues,
  asFieldArray = false
): DocumentData | AliasedField[] {
  const resultFields: AliasedField[] = columns.reduce(
    (entries: AliasedField[], column: SQL_SelectColumn) => {
      let fieldName: string;
      let fieldAlias: string;

      switch (column.expr.type) {
        case 'column_ref':
          fieldName = column.expr.column;
          fieldAlias = nameOrAlias(fieldName, column.as);
          entries.push(
            new AliasedField(
              fieldName,
              fieldAlias,
              deepGet(document, fieldName)
            )
          );
          break;

        case 'aggr_func':
          vaidateAggrFunction(column.expr);
          fieldName = (column.expr.args.expr as SQL_ColumnRef).column;
          fieldAlias = nameOrAlias(fieldName, column.as, column.expr);
          entries.push(
            new AliasedField(
              fieldName,
              fieldAlias,
              (aggregate! as any)[column.expr.name.toLowerCase()][fieldName]
            )
          );
          break;

        default:
          throw new Error('Unsupported type in SELECT.');
      }

      return entries;
    },
    []
  );

  if (asFieldArray) {
    return resultFields;
  } else {
    return resultFields.reduce((doc: DocumentData, field: AliasedField) => {
      doc[field.alias] = field.value;
      return doc;
    }, {});
  }
}

const VALID_AGGR_FUNCTIONS = ['MIN', 'MAX', 'SUM', 'AVG'];

function vaidateAggrFunction(aggrFn: SQL_AggrFunction) {
  // TODO: support COUNT, then remove this assert
  assert(
    aggrFn.name !== 'COUNT',
    'Aggregate function COUNT is not yet supported.'
  );

  assert(
    VALID_AGGR_FUNCTIONS.includes(aggrFn.name),
    `Unknown aggregate function '${aggrFn.name}'.`
  );

  assert(
    aggrFn.args.expr.type === 'column_ref',
    `Unsupported type in aggregate function '${aggrFn.name}'.`
  );
}

export function flattenGroupedDocs(
  groupedDocs: GroupedDocuments
): { [k: string]: DocumentsGroup } {
  let result: { [k: string]: any } = {};

  for (let prop in groupedDocs) {
    if (!contains(groupedDocs, prop)) {
      continue;
    }

    if (!(groupedDocs[prop] instanceof DocumentsGroup)) {
      let flatInner = flattenGroupedDocs(groupedDocs[prop] as GroupedDocuments);

      for (let innerProp in flatInner) {
        if (!contains(flatInner, innerProp)) {
          continue;
        }
        result[prop + '$$' + innerProp] = flatInner[innerProp];
      }
    } else {
      result[prop] = groupedDocs[prop];
    }
  }
  return result;
}

/**
 * Represents a field (prop) in a document.
 * It stores the original field name, the assigned alias, and the value.
 *
 * This is necessary in order to properly apply ORDER BY once
 * a result set has been built.
 */
class AliasedField {
  constructor(public name: string, public alias: string, public value: any) {}
}
