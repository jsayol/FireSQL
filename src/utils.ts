import {
  ASTValue,
  ASTValueBool,
  ASTValueNumber,
  ASTValueString,
  ASTValueNull
} from 'node-sqlparser';

export function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

export function contains(obj: object, prop: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function safeGet(obj: any, prop: string): any {
  if (contains(obj, prop)) return obj[prop];
}

export function deepGet(obj: any, path: string): any {
  let value = obj;
  const props = path.split('.');

  props.some(prop => {
    value = safeGet(value, prop);

    // By using "some" instead of "forEach", we can return
    // true whenever we want to break out of the loop.
    return typeof value === void 0;
  });

  return value;
}

export function astValueToNative(
  astValue: ASTValue
): boolean | string | number | null {
  let value: boolean | string | number | null;

  switch (astValue.type) {
    case 'bool':
    case 'null':
    case 'string':
      value = astValue.value;
      break;
    case 'number':
      value = Number(astValue.value);
      break;
    default:
      throw new Error('Unsupported value type in WHERE clause.');
  }

  return value;
}
/**
 * Adapted from: https://github.com/firebase/firebase-ios-sdk/blob/14dd9dc2704038c3bf702426439683cee4dc941a/Firestore/core/src/firebase/firestore/util/string_util.cc#L23-L40
 */
export function prefixSuccessor(prefix: string): string {
  // We can increment the last character in the string and be done
  // unless that character is 255 (0xff), in which case we have to erase the
  // last character and increment the previous character, unless that
  // is 255, etc. If the string is empty or consists entirely of
  // 255's, we just return the empty string.
  let limit = prefix;
  while (limit.length > 0) {
    const index = limit.length - 1;
    if (limit[index] === '\xff') {
      limit = limit.slice(0, -1);
    } else {
      limit =
        limit.substr(0, index) +
        String.fromCharCode(limit.charCodeAt(index) + 1);
      break;
    }
  }
  return limit;
}
