/**
 * Safe array utility functions to prevent TypeError crashes
 * when dealing with potentially undefined or null values
 */

/**
 * Safely check if a value is an array
 */
export function isArray(value: any): value is any[] {
  return Array.isArray(value);
}

/**
 * Safely get an array or return empty array if not an array
 */
export function safeArray<T>(value: T[] | undefined | null): T[] {
  return isArray(value) ? value : [];
}

/**
 * Safely slice an array
 */
export function safeSlice<T>(array: T[] | undefined | null, start?: number, end?: number): T[] {
  return isArray(array) ? array.slice(start, end) : [];
}

/**
 * Safely map over an array
 */
export function safeMap<T, U>(array: T[] | undefined | null, mapper: (item: T, index: number) => U): U[] {
  return isArray(array) ? array.map(mapper) : [];
}

/**
 * Safely filter an array
 */
export function safeFilter<T>(array: T[] | undefined | null, predicate: (item: T, index: number) => boolean): T[] {
  return isArray(array) ? array.filter(predicate) : [];
}

/**
 * Safely reduce an array
 */
export function safeReduce<T, U>(
  array: T[] | undefined | null, 
  reducer: (accumulator: U, currentValue: T, currentIndex: number) => U, 
  initialValue: U
): U {
  return isArray(array) ? array.reduce(reducer, initialValue) : initialValue;
}

/**
 * Safely find an item in an array
 */
export function safeFind<T>(array: T[] | undefined | null, predicate: (item: T, index: number) => boolean): T | undefined {
  return isArray(array) ? array.find(predicate) : undefined;
}

/**
 * Safely check if some items in array match predicate
 */
export function safeSome<T>(array: T[] | undefined | null, predicate: (item: T, index: number) => boolean): boolean {
  return isArray(array) ? array.some(predicate) : false;
}

/**
 * Safely check if every item in array matches predicate
 */
export function safeEvery<T>(array: T[] | undefined | null, predicate: (item: T, index: number) => boolean): boolean {
  return isArray(array) ? array.every(predicate) : true;
}

/**
 * Safely get array length
 */
export function safeLength(array: any[] | undefined | null): number {
  return isArray(array) ? array.length : 0;
}
