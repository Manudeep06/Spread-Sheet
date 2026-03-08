import { Cell } from '../firebase/types';

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────
export const evaluateFormula = (formula: string, cells: Record<string, Cell>): string => {
  if (!formula.startsWith('=')) return formula;
  try {
    const expr = formula.substring(1).trim();
    const result = evalExpr(expr.toUpperCase(), cells);
    if (typeof result === 'number') {
      // Round floating-point noise ( 0.1+0.2 = 0.30000000000000004 → 0.3 )
      const rounded = parseFloat(result.toPrecision(12));
      return isFinite(rounded) ? String(rounded) : '#ERROR';
    }
    return String(result);
  } catch {
    return '#ERROR';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Recursive-descent expression evaluator
//   Handles: cell refs, ranges inside functions, +−×÷, parentheses,
//            unary minus, and all built-in functions as sub-expressions.
// ─────────────────────────────────────────────────────────────────────────────
type Value = number | string;

function evalExpr(expr: string, cells: Record<string, Cell>): Value {
  const tokens = tokenize(expr);
  const parser = new Parser(tokens, cells);
  const result = parser.parseExpr();
  if (parser.pos < tokens.length) throw new Error('Unexpected token: ' + tokens[parser.pos]);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tokenizer
// ─────────────────────────────────────────────────────────────────────────────
type Token =
  | { type: 'NUM'; value: number }
  | { type: 'STR'; value: string }
  | { type: 'BOOL'; value: boolean }
  | { type: 'REF'; value: string }       // single cell ref like A1
  | { type: 'RANGE'; value: string }     // A1:B3
  | { type: 'FUNC'; value: string }      // SUM, IF, …
  | { type: 'OP'; value: string }
  | { type: 'COMMA' }
  | { type: 'LPAREN' }
  | { type: 'RPAREN' };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    // Whitespace
    if (/\s/.test(ch)) { i++; continue; }

    // String literal
    if (ch === '"') {
      let s = '';
      i++;
      while (i < expr.length && expr[i] !== '"') { s += expr[i++]; }
      i++; // closing quote
      tokens.push({ type: 'STR', value: s });
      continue;
    }

    // Numbers
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(expr[i + 1] || ''))) {
      let s = '';
      while (i < expr.length && /[\d.]/.test(expr[i])) s += expr[i++];
      tokens.push({ type: 'NUM', value: parseFloat(s) });
      continue;
    }

    // Identifiers: function names, cell refs, boolean literals
    if (/[A-Z_]/.test(ch)) {
      let s = '';
      while (i < expr.length && /[A-Z_$0-9]/.test(expr[i])) s += expr[i++];

      // Peek for range (A1:B3)
      if (expr[i] === ':') {
        const start = s;
        i++; // consume ':'
        let end = '';
        while (i < expr.length && /[A-Z0-9]/.test(expr[i])) end += expr[i++];
        tokens.push({ type: 'RANGE', value: `${start}:${end}` });
        continue;
      }

      // Peek for function call
      if (expr[i] === '(') {
        tokens.push({ type: 'FUNC', value: s });
        continue;
      }

      // Boolean literals
      if (s === 'TRUE') { tokens.push({ type: 'BOOL', value: true }); continue; }
      if (s === 'FALSE') { tokens.push({ type: 'BOOL', value: false }); continue; }

      // Cell reference (column letters + digits)
      if (/^[A-Z]+\d+$/.test(s)) {
        tokens.push({ type: 'REF', value: s });
        continue;
      }

      // Fallback: treat label as string
      tokens.push({ type: 'STR', value: s });
      continue;
    }

    // Operators and punctuation
    if (ch === '<' || ch === '>') {
      const two = expr.slice(i, i + 2);
      if (two === '<=' || two === '>=' || two === '<>') { tokens.push({ type: 'OP', value: two }); i += 2; }
      else { tokens.push({ type: 'OP', value: ch }); i++; }
      continue;
    }
    if ('+-*/^%&='.includes(ch)) { tokens.push({ type: 'OP', value: ch }); i++; continue; }
    if (ch === '(') { tokens.push({ type: 'LPAREN' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'RPAREN' }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'COMMA' }); i++; continue; }

    // Skip unknown chars
    i++;
  }
  return tokens;
}

// ─────────────────────────────────────────────────────────────────────────────
// Recursive-descent parser
// ─────────────────────────────────────────────────────────────────────────────
class Parser {
  constructor(public tokens: Token[], private cells: Record<string, Cell>) { }
  pos = 0;

  peek(): Token | undefined { return this.tokens[this.pos]; }
  consume(): Token { return this.tokens[this.pos++]; }

  // Top-level: comparison / concat
  parseExpr(): Value {
    let left = this.parseAddSub();
    while (true) {
      const t = this.peek();
      if (!t || t.type !== 'OP') break;
      const op = t.value;
      if (!['=', '<>', '<', '>', '<=', '>=', '&'].includes(op)) break;
      this.consume();
      const right = this.parseAddSub();
      if (op === '&') { left = String(left) + String(right); continue; }
      const l = typeof left === 'number' ? left : 0;
      const r = typeof right === 'number' ? right : 0;
      const ls = String(left), rs = String(right);
      switch (op) {
        case '=': left = (ls === rs) ? 1 : 0; break;
        case '<>': left = (ls !== rs) ? 1 : 0; break;
        case '<': left = (l < r) ? 1 : 0; break;
        case '>': left = (l > r) ? 1 : 0; break;
        case '<=': left = (l <= r) ? 1 : 0; break;
        case '>=': left = (l >= r) ? 1 : 0; break;
      }
    }
    return left;
  }

  parseAddSub(): Value {
    let left = this.parseMulDiv();
    while (true) {
      const t = this.peek();
      if (!t || t.type !== 'OP' || (t.value !== '+' && t.value !== '-')) break;
      const op = (this.consume() as { type: 'OP'; value: string }).value;
      const right = this.parseMulDiv();
      const l = toNum(left), r = toNum(right);
      left = op === '+' ? l + r : l - r;
    }
    return left;
  }

  parseMulDiv(): Value {
    let left = this.parsePower();
    while (true) {
      const t = this.peek();
      if (!t || t.type !== 'OP' || (t.value !== '*' && t.value !== '/' && t.value !== '%')) break;
      const op = (this.consume() as { type: 'OP'; value: string }).value;
      const right = this.parsePower();
      const l = toNum(left), r = toNum(right);
      if (op === '/') { if (r === 0) throw new Error('#DIV/0'); left = l / r; }
      else if (op === '*') left = l * r;
      else left = l % r;
    }
    return left;
  }

  parsePower(): Value {
    let base = this.parseUnary();
    const t = this.peek();
    if (t && t.type === 'OP' && t.value === '^') {
      this.consume();
      const exp = this.parseUnary();
      return Math.pow(toNum(base), toNum(exp));
    }
    return base;
  }

  parseUnary(): Value {
    const t = this.peek();
    if (t && t.type === 'OP' && t.value === '-') { this.consume(); return -toNum(this.parseUnary()); }
    if (t && t.type === 'OP' && t.value === '+') { this.consume(); return this.parseUnary(); }
    return this.parseAtom();
  }

  parseAtom(): Value {
    const t = this.peek();
    if (!t) throw new Error('Unexpected end of expression');

    // Parenthesised expression
    if (t.type === 'LPAREN') {
      this.consume();
      const val = this.parseExpr();
      if (this.peek()?.type === 'RPAREN') this.consume();
      return val;
    }

    // Literals
    if (t.type === 'NUM') { this.consume(); return t.value; }
    if (t.type === 'STR') { this.consume(); return t.value; }
    if (t.type === 'BOOL') { this.consume(); return t.value ? 1 : 0; }

    // Cell reference
    if (t.type === 'REF') {
      this.consume();
      return toNum(getCellValue(t.value, this.cells));
    }

    // Function call
    if (t.type === 'FUNC') {
      this.consume();
      const name = t.value;
      // consume '('
      if (this.peek()?.type !== 'LPAREN') throw new Error('Expected ( after ' + name);
      this.consume();
      const args = this.parseArgs();
      if (this.peek()?.type === 'RPAREN') this.consume();
      return this.callFunction(name, args);
    }

    throw new Error('Unexpected token: ' + JSON.stringify(t));
  }

  // Parse comma-separated arguments. Each arg can be a RANGE token or a full expression.
  parseArgs(): Array<Value | string> {
    const args: Array<Value | string> = [];
    if (this.peek()?.type === 'RPAREN') return args;
    while (true) {
      // Range token is passed as a raw string for aggregate functions to expand
      const t = this.peek();
      if (t?.type === 'RANGE') {
        this.consume();
        args.push(t.value); // raw range string like "A1:B3"
      } else {
        args.push(this.parseExpr());
      }
      if (this.peek()?.type === 'COMMA') { this.consume(); continue; }
      break;
    }
    return args;
  }

  callFunction(name: string, args: Array<Value | string>): Value {
    const cells = this.cells;

    const getNumbers = (): number[] => {
      const nums: number[] = [];
      for (const a of args) {
        if (typeof a === 'string' && /^[A-Z]+\d+:[A-Z]+\d+$/.test(a)) {
          nums.push(...getRangeValues(a, cells));
        } else {
          const n = toNum(a);
          if (!isNaN(n)) nums.push(n);
        }
      }
      return nums;
    };

    switch (name) {
      case 'SUM': { const ns = getNumbers(); return ns.length ? ns.reduce((a, b) => a + b, 0) : 0; }
      case 'AVERAGE': { const ns = getNumbers(); return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0; }
      case 'MIN': { const ns = getNumbers(); return ns.length ? Math.min(...ns) : 0; }
      case 'MAX': { const ns = getNumbers(); return ns.length ? Math.max(...ns) : 0; }
      case 'COUNT': return getNumbers().length;
      case 'COUNTA': {
        let c = 0;
        for (const a of args) {
          if (typeof a === 'string' && /^[A-Z]+\d+:[A-Z]+\d+$/.test(a)) {
            const [s, e] = a.split(':');
            const sc = getCellCoords(s), ec = getCellCoords(e);
            if (!sc || !ec) continue;
            for (let r = sc.row; r <= ec.row; r++)
              for (let col = sc.col; col <= ec.col; col++)
                if (getCellValue(getCellId(r, col), cells) !== '') c++;
          } else if (String(a) !== '') c++;
        }
        return c;
      }
      case 'ABS': return Math.abs(toNum(args[0]));
      case 'ROUND': return parseFloat(toNum(args[0]).toFixed(Math.round(toNum(args[1] ?? 0))));
      case 'FLOOR': return Math.floor(toNum(args[0]));
      case 'CEIL':
      case 'CEILING': return Math.ceil(toNum(args[0]));
      case 'SQRT': return Math.sqrt(toNum(args[0]));
      case 'POWER': return Math.pow(toNum(args[0]), toNum(args[1]));
      case 'MOD': return toNum(args[0]) % toNum(args[1]);
      case 'INT': return Math.trunc(toNum(args[0]));
      case 'LN': return Math.log(toNum(args[0]));
      case 'LOG': return Math.log10(toNum(args[0]));
      case 'EXP': return Math.exp(toNum(args[0]));
      case 'PI': return Math.PI;
      case 'RAND': return Math.random();
      case 'LEN': return String(args[0] ?? '').length;
      case 'UPPER': return String(args[0] ?? '').toUpperCase();
      case 'LOWER': return String(args[0] ?? '').toLowerCase();
      case 'TRIM': return String(args[0] ?? '').trim();
      case 'LEFT': return String(args[0] ?? '').slice(0, Math.round(toNum(args[1] ?? 1)));
      case 'RIGHT': { const s = String(args[0] ?? ''); return s.slice(s.length - Math.round(toNum(args[1] ?? 1))); }
      case 'MID': return String(args[0] ?? '').slice(toNum(args[1]) - 1, toNum(args[1]) - 1 + toNum(args[2]));
      case 'CONCAT':
      case 'CONCATENATE': return args.map(a => String(a)).join('');
      case 'TEXT': return String(args[0] ?? '');
      case 'VALUE': return toNum(args[0]);
      case 'IF': {
        const cond = args[0];
        return (typeof cond === 'number' ? cond !== 0 : Boolean(cond)) ? (args[1] ?? 0) : (args[2] ?? 0);
      }
      case 'AND': return args.every(a => (typeof a === 'number' ? a !== 0 : Boolean(a))) ? 1 : 0;
      case 'OR': return args.some(a => (typeof a === 'number' ? a !== 0 : Boolean(a))) ? 1 : 0;
      case 'NOT': return (typeof args[0] === 'number' ? args[0] === 0 : !args[0]) ? 1 : 0;
      case 'ISNUMBER': return typeof args[0] === 'number' ? 1 : 0;
      case 'ISTEXT': return typeof args[0] === 'string' ? 1 : 0;
      case 'ISBLANK': return (args[0] === '' || args[0] === 0) ? 1 : 0;
      default:
        throw new Error('#NAME? ' + name);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function toNum(v: Value | string | undefined): number {
  if (v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

const getCellValue = (cellRef: string, cells: Record<string, Cell>): string => {
  const cell = cells[cellRef];
  if (!cell) return '';
  if (cell.formula) return cell.computedValue?.toString() ?? '';
  return cell.value ?? '';
};

const getCellCoords = (cellId: string): { row: number; col: number } | null => {
  const match = cellId.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  let col = 0;
  for (let i = 0; i < match[1].length; i++) col = col * 26 + (match[1].charCodeAt(i) - 64);
  return { row: parseInt(match[2]) - 1, col: col - 1 };
};

const getRangeValues = (range: string, cells: Record<string, Cell>): number[] => {
  const [startRef, endRef] = range.split(':');
  const start = getCellCoords(startRef);
  const end = getCellCoords(endRef);
  if (!start || !end) return [];
  const values: number[] = [];
  const r1 = Math.min(start.row, end.row), r2 = Math.max(start.row, end.row);
  const c1 = Math.min(start.col, end.col), c2 = Math.max(start.col, end.col);
  for (let r = r1; r <= r2; r++)
    for (let c = c1; c <= c2; c++) {
      const v = parseFloat(getCellValue(getCellId(r, c), cells));
      if (!isNaN(v)) values.push(v);
    }
  return values;
};

export const getColumnName = (index: number): string => {
  let name = '';
  while (index >= 0) { name = String.fromCharCode(65 + (index % 26)) + name; index = Math.floor(index / 26) - 1; }
  return name;
};

export const getCellId = (row: number, col: number): string => `${getColumnName(col)}${row + 1}`;
