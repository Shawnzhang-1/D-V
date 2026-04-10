export type FilterOperator = 
  | 'equals' 
  | 'notEquals' 
  | 'contains' 
  | 'notContains'
  | 'greaterThan' 
  | 'lessThan' 
  | 'greaterThanOrEqual' 
  | 'lessThanOrEqual'
  | 'between'
  | 'isEmpty'
  | 'isNotEmpty';

export type FilterLogic = 'AND' | 'OR';

export interface FilterCondition {
  id: string;
  column: string;
  operator: FilterOperator;
  value: string | number | [number, number];
  enabled: boolean;
}

export interface FilterGroup {
  id: string;
  logic: FilterLogic;
  conditions: FilterCondition[];
  enabled: boolean;
}

export type ColumnType = 'number' | 'string' | 'date' | 'mixed';

export interface ColumnMeta {
  name: string;
  type: ColumnType;
  uniqueCount: number;
  nullCount: number;
  min?: number;
  max?: number;
}

const operatorLabels: Record<FilterOperator, string> = {
  equals: '等于',
  notEquals: '不等于',
  contains: '包含',
  notContains: '不包含',
  greaterThan: '大于',
  lessThan: '小于',
  greaterThanOrEqual: '大于等于',
  lessThanOrEqual: '小于等于',
  between: '介于',
  isEmpty: '为空',
  isNotEmpty: '不为空',
};

export function getOperatorLabel(operator: FilterOperator): string {
  return operatorLabels[operator];
}

export function getOperatorsForType(type: ColumnType): FilterOperator[] {
  const commonOperators: FilterOperator[] = ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'];
  
  switch (type) {
    case 'number':
      return [
        ...commonOperators,
        'greaterThan',
        'lessThan',
        'greaterThanOrEqual',
        'lessThanOrEqual',
        'between',
      ];
    case 'string':
      return [
        ...commonOperators,
        'contains',
        'notContains',
      ];
    case 'date':
      return [
        ...commonOperators,
        'greaterThan',
        'lessThan',
        'greaterThanOrEqual',
        'lessThanOrEqual',
        'between',
      ];
    default:
      return commonOperators;
  }
}

export function analyzeColumn(data: Record<string, any>[], columnName: string): ColumnMeta {
  const values = data.map(row => row[columnName]);
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  
  const types = new Set<ColumnType>();
  nonNullValues.forEach(v => {
    if (typeof v === 'number') types.add('number');
    else if (!isNaN(Date.parse(String(v))) && typeof v === 'string') types.add('date');
    else types.add('string');
  });
  
  let type: ColumnType = 'string';
  if (types.size === 1) {
    type = Array.from(types)[0] || 'string';
  } else if (types.size > 1) {
    type = 'mixed';
  }
  
  let min: number | undefined;
  let max: number | undefined;
  
  if (type === 'number') {
    const numValues = nonNullValues.map(v => Number(v)).filter(n => !isNaN(n));
    if (numValues.length > 0) {
      min = Math.min(...numValues);
      max = Math.max(...numValues);
    }
  }
  
  return {
    name: columnName,
    type,
    uniqueCount: new Set(nonNullValues.map(v => String(v))).size,
    nullCount: values.length - nonNullValues.length,
    min,
    max,
  };
}

export function analyzeAllColumns(data: Record<string, any>[], columns: string[]): ColumnMeta[] {
  return columns.map(col => analyzeColumn(data, col));
}

function evaluateCondition(value: any, operator: FilterOperator, filterValue: string | number | [number, number]): boolean {
  if (operator === 'isEmpty') {
    return value === null || value === undefined || value === '';
  }
  
  if (operator === 'isNotEmpty') {
    return value !== null && value !== undefined && value !== '';
  }
  
  if (value === null || value === undefined || value === '') {
    return false;
  }
  
  const strValue = String(value).toLowerCase();
  const strFilter = String(filterValue).toLowerCase();
  
  switch (operator) {
    case 'equals':
      if (typeof value === 'number' && typeof filterValue === 'number') {
        return value === filterValue;
      }
      return strValue === strFilter;
      
    case 'notEquals':
      if (typeof value === 'number' && typeof filterValue === 'number') {
        return value !== filterValue;
      }
      return strValue !== strFilter;
      
    case 'contains':
      return strValue.includes(strFilter);
      
    case 'notContains':
      return !strValue.includes(strFilter);
      
    case 'greaterThan':
      return Number(value) > Number(filterValue);
      
    case 'lessThan':
      return Number(value) < Number(filterValue);
      
    case 'greaterThanOrEqual':
      return Number(value) >= Number(filterValue);
      
    case 'lessThanOrEqual':
      return Number(value) <= Number(filterValue);
      
    case 'between':
      if (Array.isArray(filterValue) && filterValue.length === 2) {
        const num = Number(value);
        return num >= filterValue[0] && num <= filterValue[1];
      }
      return false;
      
    default:
      return true;
  }
}

export function filterData(
  data: Record<string, any>[],
  groups: FilterGroup[]
): Record<string, any>[] {
  if (!groups.length || groups.every(g => !g.enabled || g.conditions.every(c => !c.enabled))) {
    return data;
  }
  
  return data.filter(row => {
    const groupResults = groups.map(group => {
      if (!group.enabled) return true;
      
      const enabledConditions = group.conditions.filter(c => c.enabled);
      if (enabledConditions.length === 0) return true;
      
      const conditionResults = enabledConditions.map(condition => {
        const value = row[condition.column];
        return evaluateCondition(value, condition.operator, condition.value);
      });
      
      return group.logic === 'AND' 
        ? conditionResults.every(Boolean)
        : conditionResults.some(Boolean);
    });
    
    return groupResults.every(Boolean);
  });
}

export function createFilterCondition(column: string, type: ColumnType): FilterCondition {
  const operators = getOperatorsForType(type);
  const defaultOperator = operators[0];
  
  let defaultValue: string | number | [number, number] = '';
  if (type === 'number') {
    defaultValue = 0;
  }
  
  return {
    id: `condition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    column,
    operator: defaultOperator,
    value: defaultValue,
    enabled: true,
  };
}

export function createFilterGroup(): FilterGroup {
  return {
    id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    logic: 'AND',
    conditions: [],
    enabled: true,
  };
}

export function getFilterSummary(groups: FilterGroup[]): string {
  const enabledGroups = groups.filter(g => g.enabled && g.conditions.some(c => c.enabled));
  if (enabledGroups.length === 0) return '无筛选条件';
  
  const parts = enabledGroups.map(group => {
    const enabledConditions = group.conditions.filter(c => c.enabled);
    const conditionStrs = enabledConditions.map(c => {
      const opLabel = getOperatorLabel(c.operator);
      let valueStr = '';
      if (Array.isArray(c.value)) {
        valueStr = `${c.value[0]} - ${c.value[1]}`;
      } else {
        valueStr = String(c.value);
      }
      return `${c.column} ${opLabel} ${valueStr}`;
    });
    return conditionStrs.join(` ${group.logic} `);
  });
  
  return parts.join(' | ');
}
