import { QueryOptions } from '../shared';
import {
  SQL_SelectColumn,
  SQL_ColumnRef,
  SQL_AggrFunction,
  SQL_Select
} from '../sql-parser';
import {
  assert,
  contains,
  deepGet,
  DocumentData,
  safeGet,
  nameOrAlias,
  DOCUMENT_KEY_NAME
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

const VALID_AGGR_FUNCTIONS = ['MIN', 'MAX', 'SUM', 'AVG'];

export async function select_(
  ref: firebase.firestore.DocumentReference,
  ast: SQL_Select,
  options: QueryOptions
): Promise<DocumentData[]> {
  const selectOp = new SelectOperation(ref, ast, options);
  const queries = selectOp.generateQueries_();
  const documents = await selectOp.executeQueries_(queries);
  return selectOp.processDocuments_(queries, documents);
}

export class SelectOperation {
  _includeId?: boolean | string;

  constructor(
    private _ref: firebase.firestore.DocumentReference,
    private _ast: SQL_Select,
    options: QueryOptions
  ) {
    // We need to determine if we have to include
    // the document's ID (__name__) in the results.
    this._includeId = options.includeId || false;
    if (!this._includeId && Array.isArray(_ast.columns)) {
      for (let i = 0; i < _ast.columns.length; i++) {
        if (_ast.columns[i].expr.type === 'column_ref') {
          if (
            (_ast.columns[i].expr as SQL_ColumnRef).column === DOCUMENT_KEY_NAME
          ) {
            this._includeId = true;
            break;
          }
        }
      }
    }

    if (this._includeId === void 0) {
      this._includeId = false;
    }
  }

  generateQueries_(ast?: SQL_Select): firebase.firestore.Query[] {
    ast = ast || this._ast;

    assert(
      ast.from.parts.length % 2 === 1,
      '"FROM" needs a path to a collection (odd number of parts).'
    );

    const path = ast.from.parts.join('/');
    let queries: firebase.firestore.Query[] = [];

    if (ast.from.group) {
      assert(
        this._ref.path === '',
        'Collection group queries are only allowed from the root of the database.'
      );

      const firestore = contains(this._ref, 'firestore')
        ? this._ref.firestore
        : ((this._ref as any) as firebase.firestore.Firestore);

      assert(
        typeof (firestore as any).collectionGroup === 'function',
        `Your version of the Firebase SDK doesn't support collection group queries.`
      );
      queries.push((firestore as any).collectionGroup(path));
    } else {
      queries.push(this._ref.collection(path));
    }

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
      queries = queries.concat(this.generateQueries_(ast._next));

      // FIXME: The SQL parser incorrectly attributes ORDER BY to the second
      // SELECT only, instead of to the whole UNION. Find a workaround.
    }

    return queries;
  }

  async executeQueries_(
    queries: firebase.firestore.Query[]
  ): Promise<DocumentData[]> {
    let documents: DocumentData[] = [];
    const seenDocuments: { [id: string]: true } = {};

    try {
      await Promise.all(
        queries.map(async query => {
          const snapshot = await query.get();
          const numDocs = snapshot.docs.length;

          for (let i = 0; i < numDocs; i++) {
            const docSnap = snapshot.docs[i];
            const docPath = docSnap.ref.path;

            if (!contains(seenDocuments, docPath)) {
              const docData = docSnap.data();

              if (this._includeId) {
                docData[
                  typeof this._includeId === 'string'
                    ? this._includeId
                    : DOCUMENT_KEY_NAME
                ] = docSnap.id;
              }

              documents.push(docData);
              seenDocuments[docPath] = true;
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

  processDocuments_(
    queries: firebase.firestore.Query[],
    documents: DocumentData[]
  ): DocumentData[] {
    if (documents.length === 0) {
      return [];
    } else {
      if (this._ast.groupby) {
        const groupedDocs = applyGroupByLocally(documents, this._ast.groupby);
        return this._processGroupedDocs(queries, groupedDocs);
      } else {
        return this._processUngroupedDocs(queries, documents);
      }
    }
  }

  private _processUngroupedDocs(
    queries: firebase.firestore.Query[],
    documents: DocumentData[]
  ): DocumentData[] {
    if (this._ast.orderby && queries.length > 1) {
      // We merged more than one query into a single set of documents
      // so we need to order the documents again, this time client-side.
      documents = applyOrderByLocally(documents, this._ast.orderby);
    }

    if (this._ast.limit && queries.length > 1) {
      // We merged more than one query into a single set of documents
      // so we need to apply the limit again, this time client-side.
      documents = applyLimitLocally(documents, this._ast.limit);
    }

    if (typeof this._ast.columns === 'string' && this._ast.columns === '*') {
      // Return all fields from the documents
    } else if (Array.isArray(this._ast.columns)) {
      const aggrColumns = getAggrColumns(this._ast.columns);

      if (aggrColumns.length > 0) {
        const docsGroup = new DocumentsGroup();
        docsGroup.documents = documents;
        aggregateDocuments(docsGroup, aggrColumns);

        /// Since there is no GROUP BY and we already computed all
        // necessary aggregated values, at this point we only care
        // about the first document in the list. Anything else is
        // irrelevant.
        const resultEntry = this._buildResultEntry(
          docsGroup.documents[0],
          docsGroup.aggr
        );

        documents = [resultEntry];
      } else {
        documents = documents.map(doc => this._buildResultEntry(doc));
      }
    } else {
      // We should never reach here
      throw new Error('Internal error (ast.columns).');
    }

    return documents;
  }

  private _processGroupedDocs(
    queries: firebase.firestore.Query[],
    groupedDocs: GroupedDocuments
  ): DocumentData[] {
    assert(this._ast.columns !== '*', 'Cannot "SELECT *" when using GROUP BY.');

    const aggrColumns = getAggrColumns(this._ast.columns);
    const groups = flattenGroupedDocs(groupedDocs);

    if (aggrColumns.length === 0) {
      // We're applying a GROUP BY but none of the fields requested
      // in the SELECT are an aggregate function. In this case we
      // just return an entry for the first document.
      const firstGroupKey = Object.keys(groups)[0];
      const firstGroup = groups[firstGroupKey];
      const firstDoc = firstGroup.documents[0];
      return [this._buildResultEntry(firstDoc)];
    } else {
      const results: DocumentData[] = [];

      // TODO: ORDER BY
      assert(
        !this._ast.orderby,
        'ORDER BY is not yet supported when using GROUP BY.'
      );

      // TODO: LIMIT
      assert(
        !this._ast.limit,
        'LIMIT is not yet supported when using GROUP BY.'
      );

      Object.keys(groups).forEach(groupKey => {
        const docsGroup = groups[groupKey];
        aggregateDocuments(docsGroup, aggrColumns);

        const resultEntry = this._buildResultEntry(
          docsGroup.documents[0],
          docsGroup.aggr
        );

        results.push(resultEntry);
      });

      return results;
    }
  }

  private _buildResultEntry(
    document: DocumentData,
    aggregate?: GroupAggregateValues,
    asFieldArray?: false
  ): DocumentData;
  private _buildResultEntry(
    document: DocumentData,
    aggregate?: GroupAggregateValues,
    asFieldArray?: true
  ): AliasedField[];
  private _buildResultEntry(
    document: DocumentData,
    aggregate?: GroupAggregateValues,
    asFieldArray = false
  ): DocumentData | AliasedField[] {
    let idIncluded = false;
    const columns = this._ast.columns as SQL_SelectColumn[];

    const resultFields: AliasedField[] = columns.reduce(
      (entries: AliasedField[], column) => {
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
            if (fieldName === DOCUMENT_KEY_NAME) {
              idIncluded = true;
            }
            break;

          case 'aggr_func':
            vaidateAggrFunction(column.expr);
            fieldName = column.expr.field;
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

    if (this._includeId && !idIncluded) {
      resultFields.push(
        new AliasedField(
          DOCUMENT_KEY_NAME,
          typeof this._includeId === 'string'
            ? this._includeId
            : DOCUMENT_KEY_NAME,
          safeGet(document, DOCUMENT_KEY_NAME)
        )
      );
    }

    if (asFieldArray) {
      return resultFields;
    } else {
      return resultFields.reduce((doc: DocumentData, field: AliasedField) => {
        doc[field.alias] = field.value;
        return doc;
      }, {});
    }
  }
}

/*************************************************/

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
      let value = safeGet(doc, fn.field);
      const isNumber = !Number.isNaN(value);

      switch (fn.name) {
        case 'AVG':
          // Lets put a value so that later we know we have to compute this avg
          docsGroup.aggr.avg[fn.field] = 0;
        // tslint:disable-next-line:no-switch-case-fall-through
        case 'SUM':
          if (safeGet(skipSum, fn.field) !== true) {
            skipSum[fn.field] = true;
            if (!contains(docsGroup.aggr.total, fn.field)) {
              docsGroup.aggr.total[fn.field] = 0;
              docsGroup.aggr.sum[fn.field] = 0;
            }
            value = Number(value);
            assert(
              !Number.isNaN(value),
              `Can't compute aggregate function ${fn.name}(${
                fn.field
              }) because some values are not numbers.`
            );
            docsGroup.aggr.total[fn.field] += 1;
            docsGroup.aggr.sum[fn.field] += value;
            // FIXME: if the numbers are big we could easily go out of bounds in this sum
          }
          break;
        case 'MIN':
          assert(
            isNumber || typeof value === 'string',
            `Aggregate function MIN(${
              fn.field
            }) can only be performed on numbers or strings`
          );
          if (!contains(docsGroup.aggr.min, fn.field)) {
            docsGroup.aggr.min[fn.field] = value;
          } else {
            if (!Number.isNaN(docsGroup.aggr.min[fn.field] as any)) {
              // The current minimum is a number
              assert(
                isNumber,
                `Can't compute aggregate function MIN(${
                  fn.field
                }) because some values are not numbers.`
              );
              value = Number(value);
            }
            if (value < docsGroup.aggr.min[fn.field]) {
              docsGroup.aggr.min[fn.field] = value;
            }
          }
          break;
        case 'MAX':
          assert(
            isNumber || typeof value === 'string',
            `Aggregate function MAX(${
              fn.field
            }) can only be performed on numbers or strings`
          );
          if (!contains(docsGroup.aggr.max, fn.field)) {
            docsGroup.aggr.max[fn.field] = value;
          } else {
            if (!Number.isNaN(docsGroup.aggr.max[fn.field] as any)) {
              // The current maximum is a number
              assert(
                isNumber,
                `Can't compute aggregate function MAX(${
                  fn.field
                }) because some values are not numbers.`
              );
              value = Number(value);
            }
            if (value > docsGroup.aggr.max[fn.field]) {
              docsGroup.aggr.max[fn.field] = value;
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

function getAggrColumns(columns: SQL_SelectColumn[] | '*'): SQL_AggrFunction[] {
  const aggrColumns: SQL_AggrFunction[] = [];

  if (columns !== '*') {
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
  }

  return aggrColumns;
}

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
    // tslint:disable-next-line: strict-type-predicates
    typeof aggrFn.field === 'string',
    `Unsupported type in aggregate function '${aggrFn.name}'.`
  );
}

function flattenGroupedDocs(
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
