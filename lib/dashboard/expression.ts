import { normaliseColumnName, type DatasetValue } from '../dataset'

/**
 * A deliberately small expression language for dashboards. It covers
 * arithmetic, aggregates (`sum(balance)`), comparisons joined by `and` / `or`,
 * `in [a, b]` lists and a handful of date helpers. Nothing here can run
 * arbitrary code, so dashboards from templates are safe to render.
 */

export type Expr =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'column'; path: string[] }
  | { kind: 'call'; name: string; args: Expr[] }
  | { kind: 'unary'; op: '-' | 'not'; arg: Expr }
  | { kind: 'binary'; op: BinaryOp; left: Expr; right: Expr }
  | { kind: 'list'; items: Expr[] }

type BinaryOp = '+' | '-' | '*' | '/' | '=' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'not in' | 'and' | 'or'

export const AGGREGATES = new Set(['sum', 'avg', 'min', 'max', 'count', 'first', 'last'])

export interface ExpressionScope {
  /** Reads a (possibly dotted) column path from the current row. */
  column(path: string[]): DatasetValue
  today: Date
}

export class ExpressionError extends Error {}

type Token =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string }

export function parseExpression(source: string): Expr {
  const tokens = tokenize(source)
  let index = 0

  const peek = () => tokens[index]
  const next = () => tokens[index++]
  const isOp = (value: string) => {
    const token = peek()
    return token?.type === 'op' && token.value === value
  }
  const isWord = (value: string) => {
    const token = peek()
    return token?.type === 'ident' && token.value.toLowerCase() === value
  }
  const expectOp = (value: string) => {
    if (!isOp(value)) throw new ExpressionError(`Expected "${value}" in "${source}".`)
    index++
  }

  const parseOr = (): Expr => {
    let left = parseAnd()
    while (isWord('or')) {
      index++
      left = { kind: 'binary', op: 'or', left, right: parseAnd() }
    }
    return left
  }
  const parseAnd = (): Expr => {
    let left = parseNot()
    while (isWord('and')) {
      index++
      left = { kind: 'binary', op: 'and', left, right: parseNot() }
    }
    return left
  }
  const parseNot = (): Expr => {
    if (isWord('not') && !(tokens[index + 1]?.type === 'ident' && tokens[index + 1].value === 'in')) {
      index++
      return { kind: 'unary', op: 'not', arg: parseNot() }
    }
    return parseComparison()
  }
  const parseComparison = (): Expr => {
    const left = parseAdditive()
    const token = peek()
    if (token?.type === 'op' && ['=', '==', '!=', '>', '>=', '<', '<='].includes(token.value)) {
      index++
      const op = (token.value === '==' ? '=' : token.value) as BinaryOp
      return { kind: 'binary', op, left, right: parseValueOperand() }
    }
    if (isWord('in')) {
      index++
      return { kind: 'binary', op: 'in', left, right: parseValueOperand() }
    }
    if (isWord('not') && tokens[index + 1]?.type === 'ident' && String(tokens[index + 1].value).toLowerCase() === 'in') {
      index += 2
      return { kind: 'binary', op: 'not in', left, right: parseValueOperand() }
    }
    return left
  }
  // The right-hand side of a comparison treats bare words as text, so
  // `kind = mortgage` reads naturally without quotes. Use a function such as
  // today() or a quoted string when you need something else.
  const bareWord = (): Expr | null => {
    const token = peek()
    const following = tokens[index + 1]
    if (token?.type !== 'ident') return null
    if (following?.type === 'op' && following.value === '(') return null
    index++
    return { kind: 'string', value: token.value }
  }
  const parseValueOperand = (): Expr => {
    if (isOp('[')) {
      index++
      const items: Expr[] = []
      while (!isOp(']')) {
        if (!peek()) throw new ExpressionError(`Unclosed list in "${source}".`)
        items.push(bareWord() ?? parseAdditive())
        if (isOp(',')) index++
        else if (!isOp(']')) throw new ExpressionError(`Expected "," or "]" in "${source}".`)
      }
      index++
      return { kind: 'list', items }
    }
    return bareWord() ?? parseAdditive()
  }
  const parseAdditive = (): Expr => {
    let left = parseMultiplicative()
    while (isOp('+') || isOp('-')) {
      const op = next().value as '+' | '-'
      left = { kind: 'binary', op, left, right: parseMultiplicative() }
    }
    return left
  }
  const parseMultiplicative = (): Expr => {
    let left = parseUnary()
    while (isOp('*') || isOp('/')) {
      const op = next().value as '*' | '/'
      left = { kind: 'binary', op, left, right: parseUnary() }
    }
    return left
  }
  const parseUnary = (): Expr => {
    if (isOp('-')) {
      index++
      return { kind: 'unary', op: '-', arg: parseUnary() }
    }
    return parsePrimary()
  }
  const parsePrimary = (): Expr => {
    const token = next()
    if (!token) throw new ExpressionError(`Unexpected end of "${source}".`)
    if (token.type === 'number') return { kind: 'number', value: token.value }
    if (token.type === 'string') return { kind: 'string', value: token.value }
    if (token.type === 'op' && token.value === '(') {
      const inner = parseOr()
      expectOp(')')
      return inner
    }
    if (token.type === 'ident') {
      if (isOp('(')) {
        index++
        const args: Expr[] = []
        while (!isOp(')')) {
          args.push(parseOr())
          if (isOp(',')) index++
          else if (!isOp(')')) throw new ExpressionError(`Expected "," or ")" in "${source}".`)
        }
        index++
        return { kind: 'call', name: token.value.toLowerCase(), args }
      }
      return { kind: 'column', path: token.value.split('.').map(normaliseColumnName) }
    }
    throw new ExpressionError(`Unexpected "${token.value}" in "${source}".`)
  }

  const expr = parseOr()
  if (index < tokens.length) {
    throw new ExpressionError(`Unexpected "${String(tokens[index].value)}" in "${source}".`)
  }
  return expr
}

/** Evaluates an expression against a single row. Aggregates are not allowed here. */
export function evaluateRow(expr: Expr, scope: ExpressionScope): DatasetValue | DatasetValue[] {
  switch (expr.kind) {
    case 'number':
    case 'string':
      return expr.value
    case 'column':
      return scope.column(expr.path)
    case 'list':
      return expr.items.map((item) => scalar(evaluateRow(item, scope)))
    case 'unary': {
      const value = scalar(evaluateRow(expr.arg, scope))
      return expr.op === 'not' ? !truthy(value) : negate(value)
    }
    case 'binary':
      return evaluateBinary(expr.op, () => evaluateRow(expr.left, scope), () => evaluateRow(expr.right, scope))
    case 'call':
      if (AGGREGATES.has(expr.name)) {
        throw new ExpressionError(`${expr.name}() can only be used in a value, not per row.`)
      }
      return callScalar(expr.name, expr.args.map((arg) => scalar(evaluateRow(arg, scope))), scope.today)
  }
}

/** Evaluates an expression over a set of rows, where aggregates reduce the rows. */
export function evaluateAggregate(
  expr: Expr,
  rows: ExpressionScope[],
  today: Date
): DatasetValue {
  switch (expr.kind) {
    case 'number':
    case 'string':
      return expr.value
    case 'column':
      throw new ExpressionError(
        `Wrap ${expr.path.join('.')} in an aggregate such as sum(${expr.path.join('.')}) or last(${expr.path.join('.')}).`
      )
    case 'list':
      throw new ExpressionError('Lists can only be used with "in".')
    case 'unary': {
      const value = evaluateAggregate(expr.arg, rows, today)
      return expr.op === 'not' ? !truthy(value) : negate(value)
    }
    case 'binary':
      return scalar(
        evaluateBinary(
          expr.op,
          () => evaluateAggregate(expr.left, rows, today),
          () => evaluateAggregate(expr.right, rows, today)
        )
      )
    case 'call': {
      if (!AGGREGATES.has(expr.name)) {
        return callScalar(expr.name, expr.args.map((arg) => evaluateAggregate(arg, rows, today)), today)
      }
      if (expr.name === 'count' && expr.args.length === 0) return rows.length
      if (expr.args.length !== 1) throw new ExpressionError(`${expr.name}() takes one argument.`)
      const values = rows.map((row) => scalar(evaluateRow(expr.args[0], row)))
      return aggregate(expr.name, values)
    }
  }
}

export function aggregate(name: string, values: DatasetValue[]): DatasetValue {
  const present = values.filter((value) => value !== null && value !== '')
  if (name === 'count') return present.length
  if (name === 'first') return present[0] ?? null
  if (name === 'last') return present[present.length - 1] ?? null
  const numbers = present.map(toNumber).filter((value): value is number => value !== null)
  if (numbers.length === 0 && (name === 'min' || name === 'max') && present.length > 0) {
    // Dates and text compare as strings, so min(fixed_until) finds the earliest date.
    const sorted = present.map(String).sort()
    return name === 'min' ? sorted[0] : sorted[sorted.length - 1]
  }
  if (numbers.length === 0) return name === 'sum' ? 0 : null
  switch (name) {
    case 'sum':
      return roundMoney(numbers.reduce((total, value) => total + value, 0))
    case 'avg':
      return numbers.reduce((total, value) => total + value, 0) / numbers.length
    case 'min':
      return Math.min(...numbers)
    case 'max':
      return Math.max(...numbers)
  }
  throw new ExpressionError(`Unknown aggregate ${name}().`)
}

/** UK tax years run from 6 April to 5 April and are written as `2026-27`. */
export function ukTaxYear(date: Date | string): string {
  const iso = typeof date === 'string' ? date : isoDate(date)
  const [year, month, day] = iso.split('-').map(Number)
  const start = month > 4 || (month === 4 && day >= 6) ? year : year - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}

export function isoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function toNumber(value: DatasetValue): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value)
  return null
}

export function truthy(value: DatasetValue): boolean {
  return value !== null && value !== false && value !== 0 && value !== ''
}

function callScalar(name: string, args: DatasetValue[], today: Date): DatasetValue {
  switch (name) {
    case 'today':
      return isoDate(today)
    case 'current_tax_year':
      return ukTaxYear(today)
    case 'tax_year':
      return typeof args[0] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args[0]) ? ukTaxYear(args[0]) : null
    case 'year':
      return typeof args[0] === 'string' ? Number(args[0].slice(0, 4)) || null : null
    case 'month':
      return typeof args[0] === 'string' ? args[0].slice(0, 7) : null
    case 'days_until': {
      if (typeof args[0] !== 'string') return null
      const target = Date.parse(`${args[0]}T00:00:00`)
      const start = Date.parse(`${isoDate(today)}T00:00:00`)
      return Number.isNaN(target) ? null : Math.round((target - start) / 86_400_000)
    }
    case 'abs': {
      const value = toNumber(args[0] ?? null)
      return value === null ? null : Math.abs(value)
    }
    case 'round': {
      const value = toNumber(args[0] ?? null)
      const places = toNumber(args[1] ?? 0) ?? 0
      return value === null ? null : Number(value.toFixed(places))
    }
    case 'coalesce':
      return args.find((value) => value !== null) ?? null
  }
  throw new ExpressionError(`Unknown function ${name}().`)
}

function evaluateBinary(
  op: BinaryOp,
  leftValue: () => DatasetValue | DatasetValue[],
  rightValue: () => DatasetValue | DatasetValue[]
): DatasetValue {
  if (op === 'and') return truthy(scalar(leftValue())) && truthy(scalar(rightValue()))
  if (op === 'or') return truthy(scalar(leftValue())) || truthy(scalar(rightValue()))

  const left = leftValue()
  const right = rightValue()
  if (op === 'in' || op === 'not in') {
    const list = Array.isArray(right) ? right : [right]
    const found = list.some((item) => equals(scalar(left), item))
    return op === 'in' ? found : !found
  }

  const a = scalar(left)
  const b = scalar(right)
  switch (op) {
    case '=':
      return equals(a, b)
    case '!=':
      return !equals(a, b)
    case '>':
    case '>=':
    case '<':
    case '<=': {
      if (a === null || b === null) return false
      const order = compare(a, b)
      return op === '>' ? order > 0 : op === '>=' ? order >= 0 : op === '<' ? order < 0 : order <= 0
    }
  }

  const x = toNumber(a)
  const y = toNumber(b)
  if (x === null || y === null) return null
  switch (op) {
    case '+':
      return roundMoney(x + y)
    case '-':
      return roundMoney(x - y)
    case '*':
      return x * y
    case '/':
      return y === 0 ? null : x / y
  }
  return null
}

export function compare(a: DatasetValue, b: DatasetValue): number {
  const x = toNumber(a)
  const y = toNumber(b)
  if (x !== null && y !== null) return x - y
  return String(a ?? '').localeCompare(String(b ?? ''))
}

function equals(a: DatasetValue, b: DatasetValue): boolean {
  if (a === null || b === null) return a === b
  const x = toNumber(a)
  const y = toNumber(b)
  if (x !== null && y !== null) return x === y
  return String(a).toLowerCase() === String(b).toLowerCase()
}

function negate(value: DatasetValue): DatasetValue {
  const number = toNumber(value)
  return number === null ? null : -number
}

function scalar(value: DatasetValue | DatasetValue[]): DatasetValue {
  if (Array.isArray(value)) throw new ExpressionError('Lists can only be used with "in".')
  return value
}

function roundMoney(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let index = 0
  while (index < source.length) {
    const char = source[index]
    if (/\s/.test(char)) {
      index++
      continue
    }
    if (/\d/.test(char) || (char === '.' && /\d/.test(source[index + 1] ?? ''))) {
      const match = source.slice(index).match(/^\d*\.?\d+(?:_\d+)*/)!
      tokens.push({ type: 'number', value: Number(match[0].replace(/_/g, '')) })
      index += match[0].length
      continue
    }
    if (char === '"' || char === "'") {
      const end = source.indexOf(char, index + 1)
      if (end === -1) throw new ExpressionError(`Unclosed quote in "${source}".`)
      tokens.push({ type: 'string', value: source.slice(index + 1, end) })
      index = end + 1
      continue
    }
    if (/[A-Za-z_]/.test(char)) {
      const match = source.slice(index).match(/^[A-Za-z_][\w-]*(?:\.[A-Za-z_][\w-]*)*/)!
      // A hyphen is part of an identifier (`monzo-current`) only when no
      // spaces separate it, so `a - b` stays subtraction.
      tokens.push({ type: 'ident', value: match[0] })
      index += match[0].length
      continue
    }
    const two = source.slice(index, index + 2)
    if (['>=', '<=', '!=', '=='].includes(two)) {
      tokens.push({ type: 'op', value: two })
      index += 2
      continue
    }
    if ('+-*/=<>()[],'.includes(char)) {
      tokens.push({ type: 'op', value: char })
      index++
      continue
    }
    throw new ExpressionError(`Unexpected "${char}" in "${source}".`)
  }
  return tokens
}
