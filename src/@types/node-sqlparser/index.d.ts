/// <reference types="node" />

declare module 'node-sqlparser' {
  export class SyntaxError extends Error {
    constructor(
      message: 'string',
      expected: 'string',
      found: 'string',
      offset: number,
      line: number,
      column: number
    );
    name: 'SyntaxError';
    message: 'string';
    expected: 'string';
    found: 'string';
    offset: 'number';
    line: 'number';
    column: 'number';
  }

  export interface ASTObject {
    type: 'string';
    // TODO: fill interface with actual types
    [k: string]: any;
  }

  export default class AST {
    ast: ASTObject;
    parse(input: string): void;
    stringify(ast: ASTObject): string;
  }

  export function parse(input: string): ASTObject;
  export function stringify(): string;
}
