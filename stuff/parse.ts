import { parse } from 'node-sqlparser';

const ast = parse("SELECT * FROM cities WHERE state IS NULL");
console.log(out(ast.where));
// console.log(out(ast.where.right.value, null, 2));


function out(data: any) { return JSON.stringify(data, null, 2); }