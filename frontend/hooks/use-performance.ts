"use client";

import { useCallback, useRef, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiCallTime: number;
}

export function usePerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    apiCallTime: 0,
  });
  
  const startTimeRef = useRef<number>(0);
  const renderStartRef = useRef<number>(0);

  const startTimer = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  const startRenderTimer = useCallback(() => {
    renderStartRef.current = performance.now();
  }, []);

  const endTimer = useCallback((type: keyof PerformanceMetrics) => {
    const endTime = performance.now();
    const duration = endTime - (type === 'renderTime' ? renderStartRef.current : startTimeRef.current);
    
    setMetrics(prev => ({
      ...prev,
      [type]: duration,
    }));

    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`${type}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }, []);

  const measureApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await apiCall();
      const duration = performance.now() - start;
      
      setMetrics(prev => ({
        ...prev,
        apiCallTime: duration,
      }));

      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`API call: ${duration.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      setMetrics(prev => ({
        ...prev,
        apiCallTime: duration,
      }));
      throw error;
    }
  }, []);

  const resetMetrics = useCallback(() => {
    setMetrics({
      loadTime: 0,
      renderTime: 0,
      apiCallTime: 0,
    });
  }, []);

  return {
    metrics,
    startTimer,
    startRenderTimer,
    endTimer,
    measureApiCall,
    resetMetrics,
  };
}
