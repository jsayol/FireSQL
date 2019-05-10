export declare class SyntaxError extends Error {
  constructor(
    message: string,
    expected: string,
    found: string,
    offset: number,
    line: number,
    column: number
  );
  name: 'SyntaxError';
  message: string;
  expected: string;
  found: string;
  offset: number;
  line: number;
  column: number;
}

export interface SQL_ValueBool {
  type: 'bool';
  value: boolean;
}

export interface SQL_ValueNumber {
  type: 'number';
  value: number | string; // Sometimes the number is in a string *shrug*
}

export interface SQL_ValueString {
  type: 'string';
  value: string;
}

export interface SQL_ValueNull {
  type: 'null';
  value: null;
}

export type SQL_Value =
  | SQL_ValueBool
  | SQL_ValueNumber
  | SQL_ValueString
  | SQL_ValueNull;

export interface SQL_BinaryExpression {
  type: 'binary_expr';
  operator:
    | '='
    | '<'
    | '<='
    | '>'
    | '>='
    | 'IS'
    | 'IN'
    | 'AND'
    | 'OR'
    | 'NOT'
    | 'LIKE'
    | 'BETWEEN'
    | 'CONTAINS'
    | 'NOT CONTAINS';
  left: SQL_Expression;
  right: SQL_Expression;
}

type SQL_Expression = (
  | SQL_BinaryExpression
  | SQL_ColumnRef
  | SQL_Value
  | SQL_AggrFunction) & {
  paren: void | true;
};

export interface SQL_Select {
  type: 'select';
  distinct: 'DISTINCT' | null;
  columns: SQL_SelectColumn[] | '*';
  from: SQL_SelectFrom;
  where: SQL_Expression;
  groupby: SQL_GroupBy[];
  orderby: SQL_OrderBy[];
  limit: SQL_Value;
  params: any[];
  _next: SQL_AST;
}

export interface SQL_SelectColumn {
  expr: SQL_Expression;
  as: string | null;
}

export interface SQL_ColumnRef {
  type: 'column_ref';
  table: string;
  column: string;
}

export interface SQL_AggrFunction {
  type: 'aggr_func';
  name: 'SUM' | 'MIN' | 'MAX' | 'AVG' | 'COUNT';
  field: string;
}

export interface SQL_SelectFrom {
  parts: string[];
  as: string | null;
  group: boolean;
}

export type SQL_GroupBy = SQL_ColumnRef;

export interface SQL_OrderBy {
  expr: SQL_Expression;
  type: 'ASC' | 'DESC';
}

export type SQL_AST = SQL_Select; // TODO: add INSERT, DELETE, etc.

export function parse(input: string): SQL_AST;
