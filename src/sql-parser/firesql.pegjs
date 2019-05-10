 /*
 * Adapted from:
 * https://github.com/fishbar/node-sqlparser/blob/master/peg/sqlparser.pegjs
 */

{
  function createUnaryExpr(op, e) {
    return {
      type     : 'unary_expr',
      operator : op,
      expr     : e
    }
  }

  function createBinaryExpr(op, left, right) {
    return {
      type      : 'binary_expr',
      operator  : op,
      left      : left,
      right     : right
    }
  }

  function createList(head, tail) {
    var result = [head];
    for (var i = 0; i < tail.length; i++) {
      result.push(tail[i][3]);
    }
    return result;
  }

  function createExprList(head, tail, room) {
    var epList = createList(head, tail);
    var exprList  = [];
    var ep;
    for (var i = 0; i < epList.length; i++) {
      ep = epList[i];
      exprList.push(ep);
    }
    return exprList;
  }

  function createBinaryExprChain(head, tail) {
    var result = head;
    for (var i = 0; i < tail.length; i++) {
      result = createBinaryExpr(tail[i][1], result, tail[i][3]);
    }
    return result;
  }

  var reservedMap = {
    'SHOW'    : true,
    'DROP'    : true,
    'SELECT'  : true,
    'UPDATE'  : true,
    'CREATE'  : true,
    'DELETE'  : true,
    'INSERT'  : true,
    'REPLACE' : true,
    'EXPLAIN' : true,
    'ALL'     : true,
    'DISTINCT': true,
    'AS'      : true,
    'TABLE'   : true,
    'INTO'    : true,
    'FROM'    : true,
    'SET'     : true,
    'LEFT'    : true,
    'ON'      : true,
    'INNER'   : true,
    'JOIN'    : true,
    'UNION'   : true,
    'VALUES'  : true,
    'EXISTS'  : true,
    'WHERE'   : true,
    'GROUP'   : true,
    'BY'      : true,
    'HAVING'  : true,
    'ORDER'   : true,
    'ASC'     : true,
    'DESC'    : true,
    'LIMIT'   : true,
    'BETWEEN' : true,
    'IN'      : true,
    'IS'      : true,
    'LIKE'    : true,
    'CONTAINS': true,
    'NOT'     : true,
    'AND'     : true,
    'OR'      : true,

    //literal
    'TRUE'    : true,
    'FALSE'   : true,
    'NULL'    : true
  }
}

start
  = __ ast:union_stmt {
      return ast;
    }

union_stmt
  = head:select_stmt tail:(__ KW_UNION __ select_stmt)* {
      var cur = head;
      for (var i = 0; i < tail.length; i++) {
        cur._next = tail[i][3];
        cur = cur._next
      }
      return head;
    }

select_stmt
  =  select_stmt_nake
  / s:('(' __ select_stmt __ ')') {
      return s[2];
    }

select_stmt_nake
  = KW_SELECT           __
    d:KW_DISTINCT?      __
    c:column_clause     __
    f:from_clause?      __
    w:where_clause?     __
    g:group_by_clause?  __
    o:order_by_clause?  __
    l:limit_clause?     __ {
      return {
        type      : 'select',
        distinct  : d,
        columns   : c,
        from      : f,
        where     : w,
        groupby   : g,
        orderby   : o,
        limit     : l
      }
  }

column_clause "column_clause"
  = (KW_ALL / (STAR !ident_start)) {
      return '*';
    }
  / head:column_list_item tail:(__ COMMA __ column_list_item)* {
      return createList(head, tail);
    }

column_list_item
  = e:additive_expr __ alias:alias_clause? {
      return {
        expr : e,
        as : alias
      };
    }

alias_clause
  = KW_AS? __ i:ident { return i; }

from_clause
  = KW_FROM __ l:table_base { return l; }

table_base
  = group:(KW_GROUP __)? t:(table_name / '`' table_name '`') __ KW_AS? __ alias:ident? {
      return {
        db: t.db,
        parts: (Array.isArray(t) ? t[1] : t).parts,
        as: alias,
        group: group ? true : false
      }
    }

table_name
  = dt:('/'? ident_name)+ {
      return {
        parts: dt.map(function(parts) { return parts[1]; })
      }
    }

where_clause
  = KW_WHERE __ e:expr { return e; }

group_by_clause
  = KW_GROUP __ KW_BY __ l:column_ref_list { return l; }

column_ref_list
  = head:column_ref tail:(__ COMMA __ column_ref)* {
      return createList(head, tail);
    }

order_by_clause
  = KW_ORDER __ KW_BY __ l:order_by_list { return l; }

order_by_list
  = head:order_by_element tail:(__ COMMA __ order_by_element)* {
      return createList(head, tail);
    }

order_by_element
  = e:expr __ d:(KW_DESC / KW_ASC)? {
    var obj = {
      expr : e,
      type : 'ASC'
    }
    if (d == 'DESC') {
      obj.type = 'DESC';
    }
    return obj;
  }

limit_clause
  = KW_LIMIT __ lim:(literal_int) {
      return lim;
    }

//for template auto fill
expr_list
  = head:expr tail:(__ COMMA __ expr)*{
      var el = {
        type : 'expr_list',
        value: undefined
      }

      var l = createExprList(head, tail, el);

      el.value = l;
      return el;
    }

// expr_list_or_empty
//   = l:expr_list
//   / (''{
//       return {
//         type  : 'expr_list',
//         value : []
//       }
//     })

/**
 * Borrowed from PL/SQL ,the priority of below list IS ORDER BY DESC
 * ---------------------------------------------------------------------------------------------------
 * | +, -                                                     | identity, negation                   |
 * | *, /                                                     | multiplication, division             |
 * | +, -                                                     | addition, subtraction, concatenation |
 * | =, <, >, <=, >=, <>, !=, IS, LIKE, BETWEEN, IN, CONTAINS | comparion                            |
 * | !, NOT                                                   | logical negation                     |
 * | AND                                                      | conjunction                          |
 * | OR                                                       | inclusion                            |
 * ---------------------------------------------------------------------------------------------------
 */

expr = or_expr

or_expr
  = head:and_expr tail:(__ KW_OR __ and_expr)* {
      return createBinaryExprChain(head, tail);
    }

and_expr
  = head:not_expr tail:(__ KW_AND __ not_expr)* {
      return createBinaryExprChain(head, tail);
    }

not_expr
  = (KW_NOT / "!" !"=") __ expr:not_expr {
      return createUnaryExpr('NOT', expr);
    }
  / comparison_expr

comparison_expr
  = left:additive_expr __ rh:comparison_op_right? {
      if (!rh) {
        return left;
      } else {
        var res = null;
        if (rh.type == 'arithmetic') {
          res = createBinaryExprChain(left, rh.tail);
        } else {
          res = createBinaryExpr(rh.op, left, rh.right);
        }
        return res;
      }
    }

comparison_op_right
  = arithmetic_op_right
    / in_op_right
    / between_op_right
    / is_op_right
    / like_op_right
    / contains_op_right

arithmetic_op_right
  = l:(__ arithmetic_comparison_operator __ additive_expr)+ {
      return {
        type : 'arithmetic',
        tail : l
      }
    }

arithmetic_comparison_operator
  = ">=" / ">" / "<=" / "<>" / "<" / "=" / "!="

is_op_right
  = op:KW_IS __ right:additive_expr {
      return {
        op    : op,
        right : right
      }
    }

between_op_right
  = op:KW_BETWEEN __  begin:additive_expr __ KW_AND __ end:additive_expr {
      return {
        op    : op,
        right : {
          type : 'expr_list',
          value : [begin, end]
        }
      }
    }

like_op
  = nk:(KW_NOT __ KW_LIKE) { return nk[0] + ' ' + nk[2]; }
  / KW_LIKE

in_op
  = nk:(KW_NOT __ KW_IN) { return nk[0] + ' ' + nk[2]; }
  / KW_IN

contains_op
  = nk:(KW_NOT __ KW_CONTAINS) { return nk[0] + ' ' + nk[2]; }
  / KW_CONTAINS

like_op_right
  = op:like_op __ right:comparison_expr {
      return {
        op    : op,
        right : right
      }
    }

in_op_right
  = op:in_op __ LPAREN  __ l:expr_list __ RPAREN {
      return {
        op    : op,
        right : l
      }
    }

contains_op_right
  = op:contains_op __ l:literal {
      return {
        op    : op,
        right : l
      }
    }

additive_expr
  = head:multiplicative_expr
    tail:(__ additive_operator  __ multiplicative_expr)* {
      return createBinaryExprChain(head, tail);
    }

additive_operator
  = "+" / "-"

multiplicative_expr
  = head:primary
    tail:(__ multiplicative_operator  __ primary)* {
      return createBinaryExprChain(head, tail)
    }

multiplicative_operator
  = "*" / "/" / "%"

primary
  = literal
  / aggr_func
  / column_ref
  / LPAREN __ e:expr __ RPAREN {
      e.paren = true;
      return e;
    }

column_ref
  = tbl:ident __ DOT __ col:column {
      return {
        type  : 'column_ref',
        table : tbl,
        column : col
      };
    }
  / col:column {
      return {
        type  : 'column_ref',
        table : '',
        column: col
      };
    }

column_list
  = head:column tail:(__ COMMA __ column)* {
      return createList(head, tail);
    }

ident =
  name:ident_name !{ return reservedMap[name.toUpperCase()] === true; } {
    return name;
  }

column =
  name:ident_name !{ return reservedMap[name.toUpperCase()] === true; } {
    return name;
  }
  /'`' chars:[^`]+ '`' {
    return chars.join('');
  }

ident_name
  =  parts:ident_part+ { return parts.join(''); }

ident_start = [A-Za-z_]

ident_part  = [A-Za-z0-9_]

aggr_func
  = name:KW_SUM_MAX_MIN_AVG __ LPAREN __ f:ident_name __ RPAREN {
      return {
        type : 'aggr_func',
        name : name,
        field: f
      }
    }

KW_SUM_MAX_MIN_AVG
  = w:(KW_SUM / KW_MAX / KW_MIN / KW_AVG) {
    return w;
  }

star_expr
  = "*" {
      return {
        type  : 'star',
        value : '*'
      }
    }

literal
  = literal_string / literal_numeric / literal_bool / literal_null

literal_list
  = head:literal tail:(__ COMMA __ literal)* {
      return createList(head, tail);
    }

literal_null
  = KW_NULL {
      return {
        type  : 'null',
        value : null
      };
    }

literal_bool
  = KW_TRUE {
      return {
        type  : 'bool',
        value : true
      };
    }
  / KW_FALSE {
      return {
        type  : 'bool',
        value : false
      };
    }

literal_string
  = ca:( ('"' double_char* '"')
        /("'" single_char* "'")) {
      return {
        type  : 'string',
        value : ca[1].join('')
      }
    }

single_char
  = [^'\\\0-\x1F\x7f]
  / escape_char

double_char
  = [^"\\\0-\x1F\x7f]
  / escape_char

escape_char
  = "\\'"  { return "'";  }
  / '\\"'  { return '"';  }
  / "\\\\" { return "\\"; }
  / "\\/"  { return "/";  }
  / "\\b"  { return "\b"; }
  / "\\f"  { return "\f"; }
  / "\\n"  { return "\n"; }
  / "\\r"  { return "\r"; }
  / "\\t"  { return "\t"; }
  / "\\u" h1:hexDigit h2:hexDigit h3:hexDigit h4:hexDigit {
      return String.fromCharCode(parseInt("0x" + h1 + h2 + h3 + h4));
    }

line_terminator
  = [\n\r]

literal_numeric
  = n:number {
      return {
        type  : 'number',
        value : n
      }
    }
literal_int "LITERAL INT"
  = n:int {
    return {
      type: 'number',
      value: n
    }
  }

number
  = int_:int frac:frac exp:exp __ { var x = parseFloat(int_ + frac + exp); return (x % 1 != 0) ? x.toString() : x.toString() + ".0"}
  / int_:int frac:frac __         { var x = parseFloat(int_ + frac); return (x % 1 != 0) ? x.toString() : x.toString() + ".0"}
  / int_:int exp:exp __           { return parseFloat(int_ + exp).toString(); }
  / int_:int __                   { return parseFloat(int_).toString(); }

int
  = digit19:digit19 digits:digits     { return digit19 + digits;       }
  / digit:digit
  / op:("-" / "+" ) digit19:digit19 digits:digits { return "-" + digit19 + digits; }
  / op:("-" / "+" ) digit:digit                   { return "-" + digit;            }

frac
  = "." digits:digits { return "." + digits; }

exp
  = e:e digits:digits { return e + digits; }

digits
  = digits:digit+ { return digits.join(""); }

digit "NUMBER"  = [0-9]
digit19 "NUMBER" = [1-9]

hexDigit "HEX"
  = [0-9a-fA-F]

e
  = e:[eE] sign:[+-]? { return e + sign; }


KW_NULL     = "NULL"i     !ident_start
KW_TRUE     = "TRUE"i     !ident_start
KW_FALSE    = "FALSE"i    !ident_start

KW_SHOW     = "SHOW"i     !ident_start
KW_SELECT   = "SELECT"i   !ident_start

KW_FROM     = "FROM"i     !ident_start

KW_AS       = "AS"i       !ident_start
KW_TABLE    = "TABLE"i    !ident_start

KW_UNION    = "UNION"i    !ident_start

KW_IF       = "IF"i       !ident_start
KW_EXISTS   = "EXISTS"i   !ident_start

KW_WHERE    = "WHERE"i    !ident_start

KW_GROUP    = "GROUP"i    !ident_start
KW_BY       = "BY"i       !ident_start
KW_ORDER    = "ORDER"i    !ident_start

KW_LIMIT    = "LIMIT"i    !ident_start

KW_ASC      = "ASC"i      !ident_start    { return 'ASC';     }
KW_DESC     = "DESC"i     !ident_start    { return 'DESC';    }

KW_ALL      = "ALL"i      !ident_start    { return 'ALL';     }
KW_DISTINCT = "DISTINCT"i !ident_start    { return 'DISTINCT';}

KW_BETWEEN  = "BETWEEN"i  !ident_start    { return 'BETWEEN'; }
KW_IN       = "IN"i       !ident_start    { return 'IN';      }
KW_IS       = "IS"i       !ident_start    { return 'IS';      }
KW_LIKE     = "LIKE"i     !ident_start    { return 'LIKE';    }
KW_CONTAINS = "CONTAINS"i !ident_start    { return 'CONTAINS';}

KW_NOT      = "NOT"i      !ident_start    { return 'NOT';     }
KW_AND      = "AND"i      !ident_start    { return 'AND';     }
KW_OR       = "OR"i       !ident_start    { return 'OR';      }

KW_COUNT    = "COUNT"i    !ident_start    { return 'COUNT';   }
KW_MAX      = "MAX"i      !ident_start    { return 'MAX';     }
KW_MIN      = "MIN"i      !ident_start    { return 'MIN';     }
KW_SUM      = "SUM"i      !ident_start    { return 'SUM';     }
KW_AVG      = "AVG"i      !ident_start    { return 'AVG';     }

//specail character
DOT       = '.'
COMMA     = ','
STAR      = '*'
LPAREN    = '('
RPAREN    = ')'

__ =
  whitespace*

char = .

whitespace 'WHITE_SPACE' = [ \t\n\r]
