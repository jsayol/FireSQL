import { parse } from 'node-sqlparser';

// const ast = parse("SELECT C.name AS city, 2*C.population FROM cities C WHERE C.state='Hello'");
const ast = parse(`
    SELECT
        C.name AS city,
        2 * C.population AS doublePopulation,
        'hello' AS greeting
    FROM cities C
    WHERE C.country = 'USA'
`);
console.log(out(ast));
// console.log(out(ast.where.right.value, null, 2));


function out(data: any) { return JSON.stringify(data, null, 2); }