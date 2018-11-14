/// <reference types="node" />

declare module 'node-sqlparser' {
  export class SyntaxError extends Error {
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

  export interface ASTValueBool {
    type: 'bool';
    value: boolean;
  }

  export interface ASTValueNumber {
    type: 'number';
    value: number | string; // Sometimes the number is in a string *shrug*
  }

  export interface ASTValueString {
    type: 'string';
    value: string;
  }

  export interface ASTValueNull {
    type: 'null';
    value: null;
  }

  export type ASTValue =
    | ASTValueBool
    | ASTValueNumber
    | ASTValueString
    | ASTValueNull;

  export interface ASTBinaryExpression {
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
    left: ASTExpression;
    right: ASTExpression;
  }

  type ASTExpression = (ASTBinaryExpression | ASTColumnRef | ASTValue) & {
    paren: void | true;
  };

  export interface ASTSelect {
    type: 'select';
    distinct: 'DISTINCT' | null;
    columns: ASTSelectColumn[];
    from: ASTSelectFrom[];
    where: ASTExpression;
    groupby: ASTGroupBy[];
    orderby: ASTOrderBy[];
    limit: ASTValue[];
    params: any[];
    _next: ASTObject;
  }

  export interface ASTSelectColumn {
    expr: ASTExpression;
    as: string | null;
  }

  export interface ASTColumnRef {
    type: 'column_ref';
    table: string;
    column: string;
  }

  export interface ASTSelectFrom {
    db: string;
    table: string;
    as: string | null;
  }

  export type ASTGroupBy = ASTColumnRef;

  export interface ASTOrderBy {
    expr: ASTExpression;
    type: 'ASC' | 'DESC';
  }

  export type ASTObject = ASTSelect; // TODO: add INSERT, DELETE, etc.

  export default class AST {
    ast: ASTObject;
    parse(input: string): void;
    stringify(ast: ASTObject): string;
  }

  export function parse(input: string): ASTObject;
  export function stringify(): string;
}
