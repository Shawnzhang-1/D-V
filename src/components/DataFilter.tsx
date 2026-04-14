import React, { useState, useMemo, useCallback } from 'react';
import { Filter, Plus, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import {
  FilterGroup,
  FilterCondition,
  FilterOperator,
  ColumnMeta,
  createFilterCondition,
  createFilterGroup,
  getOperatorsForType,
  getOperatorLabel,
  filterData,
  getFilterSummary,
} from '../utils/dataFilter';

interface DataFilterProps {
  data: Record<string, any>[];
  columns: ColumnMeta[];
  onFilter: (filteredData: Record<string, any>[]) => void;
  className?: string;
}

const DataFilter: React.FC<DataFilterProps> = ({
  data,
  columns,
  onFilter,
  className = '',
}) => {
  const [groups, setGroups] = useState<FilterGroup[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  const columnMap = useMemo(() => {
    const map = new Map<string, ColumnMeta>();
    columns.forEach(col => map.set(col.name, col));
    return map;
  }, [columns]);

  const filteredData = useMemo(() => {
    return filterData(data, groups);
  }, [data, groups]);

  const filterSummary = useMemo(() => {
    return getFilterSummary(groups);
  }, [groups]);

  const handleApplyFilter = useCallback(() => {
    onFilter(filteredData);
  }, [filteredData, onFilter]);

  const handleClearAll = useCallback(() => {
    setGroups([]);
    onFilter(data);
  }, [data, onFilter]);

  const addGroup = useCallback(() => {
    setGroups(prev => [...prev, createFilterGroup()]);
  }, []);

  const removeGroup = useCallback((groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, enabled: !g.enabled } : g
    ));
  }, []);

  const toggleGroupLogic = useCallback((groupId: string) => {
    setGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, logic: g.logic === 'AND' ? 'OR' : 'AND' } : g
    ));
  }, []);

  const addCondition = useCallback((groupId: string) => {
    const firstColumn = columns[0];
    if (!firstColumn) return;
    
    const newCondition = createFilterCondition(firstColumn.name, firstColumn.type);
    
    setGroups(prev => prev.map(g => 
      g.id === groupId 
        ? { ...g, conditions: [...g.conditions, newCondition] }
        : g
    ));
  }, [columns]);

  const removeCondition = useCallback((groupId: string, conditionId: string) => {
    setGroups(prev => prev.map(g => 
      g.id === groupId 
        ? { ...g, conditions: g.conditions.filter(c => c.id !== conditionId) }
        : g
    ));
  }, []);

  const toggleCondition = useCallback((groupId: string, conditionId: string) => {
    setGroups(prev => prev.map(g => 
      g.id === groupId 
        ? {
            ...g,
            conditions: g.conditions.map(c => 
              c.id === conditionId ? { ...c, enabled: !c.enabled } : c
            ),
          }
        : g
    ));
  }, []);

  const updateCondition = useCallback((
    groupId: string,
    conditionId: string,
    updates: Partial<FilterCondition>
  ) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      
      return {
        ...g,
        conditions: g.conditions.map(c => {
          if (c.id !== conditionId) return c;
          
          const newCondition = { ...c, ...updates };
          
          if (updates.column) {
            const colMeta = columnMap.get(updates.column);
            if (colMeta) {
              const operators = getOperatorsForType(colMeta.type);
              if (!operators.includes(newCondition.operator)) {
                newCondition.operator = operators[0];
              }
              if (colMeta.type === 'number') {
                newCondition.value = 0;
              } else {
                newCondition.value = '';
              }
            }
          }
          
          return newCondition;
        }),
      };
    }));
  }, [columnMap]);

  const renderValueInput = (group: FilterGroup, condition: FilterCondition) => {
    const colMeta = columnMap.get(condition.column);
    const isRange = condition.operator === 'between';
    
    if (condition.operator === 'isEmpty' || condition.operator === 'isNotEmpty') {
      return null;
    }
    
    if (colMeta?.type === 'number' || isRange) {
      if (isRange) {
        const rangeValue = Array.isArray(condition.value) ? condition.value : [0, 100];
        return (
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={rangeValue[0]}
              onChange={(e) => updateCondition(group.id, condition.id, { 
                value: [Number(e.target.value), rangeValue[1]] 
              })}
              className="input w-24"
              placeholder="最小值"
            />
            <span style={{ color: 'var(--color-text-secondary)' }}>-</span>
            <input
              type="number"
              value={rangeValue[1]}
              onChange={(e) => updateCondition(group.id, condition.id, { 
                value: [rangeValue[0], Number(e.target.value)] 
              })}
              className="input w-24"
              placeholder="最大值"
            />
          </div>
        );
      }
      
      return (
        <input
          type="number"
          value={condition.value as number}
          onChange={(e) => updateCondition(group.id, condition.id, { 
            value: Number(e.target.value) 
          })}
          className="input w-32"
          placeholder="输入数值"
        />
      );
    }
    
    return (
      <input
        type="text"
        value={condition.value as string}
        onChange={(e) => updateCondition(group.id, condition.id, { 
          value: e.target.value 
        })}
        className="input w-40"
        placeholder="输入值"
      />
    );
  };

  return (
    <div className={`card overflow-hidden ${className}`}>
      <div 
        className="px-6 py-4 border-b cursor-pointer flex items-center justify-between"
        style={{ borderColor: 'var(--color-border)' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div 
            className="p-2 rounded-xl"
            style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-md)' }}
          >
            <Filter className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>数据筛选</h2>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{filterSummary}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {groups.length > 0 && (
            <span className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
              {filteredData.length} / {data.length} 行
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
          ) : (
            <ChevronDown className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-6">
          {groups.length === 0 ? (
            <div className="text-center py-8">
              <Filter className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-border)' }} />
              <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>暂无筛选条件</p>
              <button onClick={addGroup} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                <span>添加筛选组</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group, groupIndex) => (
                <div 
                  key={group.id} 
                  className="p-4 rounded-xl border-2 transition-all"
                  style={{
                    borderColor: group.enabled ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: group.enabled ? 'var(--color-surface)' : 'var(--color-surface-hover)'
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className="w-4 h-4 rounded-full border-2 transition-colors"
                        style={{
                          backgroundColor: group.enabled ? 'var(--color-primary)' : 'transparent',
                          borderColor: group.enabled ? 'var(--color-primary)' : 'var(--color-border)'
                        }}
                      />
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                        筛选组 {groupIndex + 1}
                      </span>
                      <button
                        onClick={() => toggleGroupLogic(group.id)}
                        className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: group.logic === 'AND' ? 'rgba(var(--color-primary-rgb, 94, 129, 172), 0.2)' : 'rgba(var(--color-warning-rgb, 208, 135, 112), 0.2)',
                          color: group.logic === 'AND' ? 'var(--color-primary)' : 'var(--color-warning)'
                        }}
                      >
                        {group.logic === 'AND' ? '且 (AND)' : '或 (OR)'}
                      </button>
                    </div>
                    <button
                      onClick={() => removeGroup(group.id)}
                      className="p-1 rounded-lg transition-colors"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--color-error-rgb, 191, 97, 106), 0.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Trash2 className="w-4 h-4" style={{ color: 'var(--color-error)' }} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {group.conditions.map((condition) => {
                      const colMeta = columnMap.get(condition.column);
                      const operators = colMeta ? getOperatorsForType(colMeta.type) : [];
                      
                      return (
                        <div 
                          key={condition.id}
                          className="flex items-center space-x-2 p-2 rounded-lg transition-colors"
                          style={{ backgroundColor: condition.enabled ? 'var(--color-background)' : 'var(--color-surface-hover)' }}
                        >
                          <button
                            onClick={() => toggleCondition(group.id, condition.id)}
                            className="w-4 h-4 rounded border-2 transition-colors"
                            style={{
                              backgroundColor: condition.enabled ? 'var(--color-primary)' : 'transparent',
                              borderColor: condition.enabled ? 'var(--color-primary)' : 'var(--color-border)'
                            }}
                          />
                          
                          <select
                            value={condition.column}
                            onChange={(e) => updateCondition(group.id, condition.id, { 
                              column: e.target.value 
                            })}
                            className="input select w-32"
                          >
                            {columns.map(col => (
                              <option key={col.name} value={col.name}>{col.name}</option>
                            ))}
                          </select>

                          <select
                            value={condition.operator}
                            onChange={(e) => updateCondition(group.id, condition.id, { 
                              operator: e.target.value as FilterOperator 
                            })}
                            className="input select w-28"
                          >
                            {operators.map(op => (
                              <option key={op} value={op}>{getOperatorLabel(op)}</option>
                            ))}
                          </select>

                          {renderValueInput(group, condition)}

                          <button
                            onClick={() => removeCondition(group.id, condition.id)}
                            className="p-1 rounded-lg transition-colors"
                            style={{ backgroundColor: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--color-error-rgb, 191, 97, 106), 0.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <X className="w-4 h-4" style={{ color: 'var(--color-error)' }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => addCondition(group.id)}
                    className="mt-3 flex items-center space-x-1 text-sm transition-colors"
                    style={{ color: 'var(--color-primary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accent)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                  >
                    <Plus className="w-4 h-4" />
                    <span>添加条件</span>
                  </button>
                </div>
              ))}

              <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button onClick={addGroup} className="btn btn-secondary">
                  <Plus className="w-4 h-4" />
                  <span>添加筛选组</span>
                </button>
                
                <div className="flex items-center space-x-2">
                  <button onClick={handleClearAll} className="btn btn-ghost">
                    清除全部
                  </button>
                  <button onClick={handleApplyFilter} className="btn btn-primary">
                    应用筛选
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataFilter;
