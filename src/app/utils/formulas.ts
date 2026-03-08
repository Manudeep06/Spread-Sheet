import { Cell } from '../firebase/types';

export const evaluateFormula = (formula: string, cells: Record<string, Cell>): string => {
  if (!formula.startsWith('=')) {
    return formula;
  }

  try {
    const expression = formula.substring(1);
    
    // Handle SUM function
    if (expression.toUpperCase().startsWith('SUM(')) {
      return evaluateSum(expression, cells);
    }
    
    // Handle basic arithmetic operations
    return evaluateArithmetic(expression, cells);
  } catch {
    return '#ERROR';
  }
};

const evaluateSum = (expression: string, cells: Record<string, Cell>): string => {
  const match = expression.match(/SUM\(([^)]+)\)/i);
  if (!match) return '#ERROR';
  
  const args = match[1].split(',').map(arg => arg.trim());
  let sum = 0;
  
  for (const arg of args) {
    const value = getCellValue(arg, cells);
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      return '#ERROR';
    }
    
    sum += numValue;
  }
  
  return sum.toString();
};

const evaluateArithmetic = (expression: string, cells: Record<string, Cell>): string => {
  // Replace cell references with their values
  let processedExpression = expression;
  
  // Match cell references like A1, B2, etc.
  const cellRefRegex = /[A-Z]+\d+/g;
  const matches = expression.match(cellRefRegex) || [];
  
  for (const cellRef of matches) {
    const value = getCellValue(cellRef, cells);
    processedExpression = processedExpression.replace(cellRef, value);
  }
  
  // Evaluate the arithmetic expression
  try {
    // Use Function constructor for safer evaluation than eval
    const result = new Function('return ' + processedExpression)();
    
    if (isNaN(result) || !isFinite(result)) {
      return '#ERROR';
    }
    
    return result.toString();
  } catch {
    return '#ERROR';
  }
};

const getCellValue = (cellRef: string, cells: Record<string, Cell>): string => {
  const cell = cells[cellRef];
  if (!cell) return '0';
  
  // If the cell has a formula, evaluate it recursively
  if (cell.formula) {
    return evaluateFormula(cell.formula, cells);
  }
  
  // Return the value, treating empty as 0 for arithmetic
  const value = cell.value || '0';
  
  // Try to parse as number, if fails return as is
  const numValue = parseFloat(value);
  return isNaN(numValue) ? value : numValue.toString();
};

export const getColumnName = (index: number): string => {
  let columnName = '';
  while (index >= 0) {
    columnName = String.fromCharCode(65 + (index % 26)) + columnName;
    index = Math.floor(index / 26) - 1;
  }
  return columnName;
};

export const getCellId = (row: number, col: number): string => {
  return `${getColumnName(col)}${row + 1}`;
};
