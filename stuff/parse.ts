import { parse } from 'node-sqlparser';

// const ast = parse("SELECT C.name AS city, 2*C.population FROM cities C WHERE C.state='Hello'");
// const ast = parse(`
//     SELECT
//         C.name AS city,
//         2 * C.population AS doublePopulation,
//         'hello' AS greeting
//     FROM cities C
//     WHERE C.country = 'USA'
// `);
const ast = parse(`
SELECT *
FROM cities
LIMIT 10, 5`);
console.log(out(ast));

function out(data: any) {
  return JSON.stringify(data, null, 2);
}
