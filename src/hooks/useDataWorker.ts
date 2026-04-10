export interface WorkerMessage {
  type: 'parse' | 'filter' | 'clean' | 'aggregate';
  payload: any;
  id: string;
}

export interface WorkerResponse {
  type: 'success' | 'error' | 'progress';
  payload: any;
  id: string;
}

export function createDataWorker(): Worker {
  const workerCode = `
    self.onmessage = function(e) {
      const { type, payload, id } = e.data;
      
      try {
        switch (type) {
          case 'filter':
            handleFilter(payload, id);
            break;
          case 'clean':
            handleClean(payload, id);
            break;
          default:
            sendError(id, 'Unknown message type');
        }
      } catch (error) {
        sendError(id, error.message);
      }
    };
    
    function sendProgress(id, progress, message) {
      self.postMessage({ type: 'progress', id, payload: { progress, message } });
    }
    
    function sendSuccess(id, result) {
      self.postMessage({ type: 'success', id, payload: result });
    }
    
    function sendError(id, error) {
      self.postMessage({ type: 'error', id, payload: error });
    }
    
    function handleFilter(payload, id) {
      const { data, groups } = payload;
      
      sendProgress(id, 0, '开始筛选...');
      
      const filtered = data.filter(function(row) {
        return groups.every(function(group) {
          if (!group.enabled) return true;
          return group.conditions.filter(function(c) { return c.enabled; }).every(function(condition) {
            const value = row[condition.column];
            return evaluateCondition(value, condition.operator, condition.value);
          });
        });
      });
      
      sendProgress(id, 100, '筛选完成');
      sendSuccess(id, { data: filtered, count: filtered.length });
    }
    
    function evaluateCondition(value, operator, filterValue) {
      if (operator === 'isEmpty') return value === null || value === undefined || value === '';
      if (operator === 'isNotEmpty') return value !== null && value !== undefined && value !== '';
      if (value === null || value === undefined || value === '') return false;
      
      var strValue = String(value).toLowerCase();
      var strFilter = String(filterValue).toLowerCase();
      
      if (operator === 'equals') return strValue === strFilter;
      if (operator === 'notEquals') return strValue !== strFilter;
      if (operator === 'contains') return strValue.includes(strFilter);
      if (operator === 'notContains') return !strValue.includes(strFilter);
      if (operator === 'greaterThan') return Number(value) > Number(filterValue);
      if (operator === 'lessThan') return Number(value) < Number(filterValue);
      return true;
    }
    
    function handleClean(payload, id) {
      const { data, operations } = payload;
      
      sendProgress(id, 0, '开始清洗...');
      
      var result = data.slice();
      
      operations.forEach(function(op) {
        if (op.type === 'removeNull' && op.column) {
          result = result.filter(function(row) {
            var value = row[op.column];
            return value !== null && value !== undefined && value !== '';
          });
        }
      });
      
      sendProgress(id, 100, '清洗完成');
      sendSuccess(id, { data: result, count: result.length });
    }
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}

import { useRef, useState, useEffect, useCallback } from 'react';

export function useDataWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const sendMessage = useCallback(<T,>(type: WorkerMessage['type'], payload: any): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        workerRef.current = createDataWorker();
      }

      const id = type + '-' + Date.now();
      
      const handleMessage = (e: MessageEvent) => {
        const response: WorkerResponse = e.data;
        if (response.id !== id) return;

        if (response.type === 'progress') {
          setProgress(response.payload.progress);
          setProgressMessage(response.payload.message);
        } else if (response.type === 'success') {
          workerRef.current?.removeEventListener('message', handleMessage);
          setIsProcessing(false);
          resolve(response.payload);
        } else if (response.type === 'error') {
          workerRef.current?.removeEventListener('message', handleMessage);
          setIsProcessing(false);
          reject(new Error(response.payload));
        }
      };

      workerRef.current.addEventListener('message', handleMessage);
      setIsProcessing(true);
      setProgress(0);
      setProgressMessage('');

      const message: WorkerMessage = { type, payload, id };
      workerRef.current.postMessage(message);
    });
  }, []);

  return { sendMessage, isProcessing, progress, progressMessage };
}
