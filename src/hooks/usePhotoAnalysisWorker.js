import { useEffect, useRef, useCallback } from 'react';

export function usePhotoAnalysisWorker() {
  const workerRef = useRef(null);
  const pendingCallbacksRef = useRef(new Map());
  const requestIdRef = useRef(0);

  useEffect(() => {
    try {
      // Initialize worker with fallback
      if (typeof Worker !== 'undefined') {
        workerRef.current = new Worker('/workers/photoAnalysisWorker.js');

        workerRef.current.onmessage = (event) => {
          const { type, data, requestId, error } = event.data;
          const callback = pendingCallbacksRef.current.get(requestId);

          if (callback) {
            if (type === 'error') {
              callback.reject(new Error(error));
            } else {
              callback.resolve(data);
            }
            pendingCallbacksRef.current.delete(requestId);
          }
        };

        workerRef.current.onerror = (error) => {
          console.error('PhotoAnalysisWorker error:', error);
          // Notify all pending callbacks of error
          pendingCallbacksRef.current.forEach((callback) => {
            callback.reject(new Error('Worker error'));
          });
          pendingCallbacksRef.current.clear();
        };
      }
    } catch (error) {
      console.warn('PhotoAnalysisWorker not available:', error);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const analyzeImage = useCallback(
    (imageData, width, height) => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'));
          return;
        }

        const requestId = ++requestIdRef.current;
        pendingCallbacksRef.current.set(requestId, { resolve, reject });

        try {
          workerRef.current.postMessage(
            {
              requestId,
              command: 'analyzeImage',
              payload: { imageData, width, height }
            },
            [imageData.buffer] // Transfer ownership for zero-copy
          );
        } catch (error) {
          pendingCallbacksRef.current.delete(requestId);
          reject(error);
        }
      });
    },
    []
  );

  const processFrame = useCallback(
    (frameData, options = {}) => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'));
          return;
        }

        const requestId = ++requestIdRef.current;
        pendingCallbacksRef.current.set(requestId, { resolve, reject });

        try {
          workerRef.current.postMessage({
            requestId,
            command: 'processFrame',
            payload: { frameData, options }
          });
        } catch (error) {
          pendingCallbacksRef.current.delete(requestId);
          reject(error);
        }
      });
    },
    []
  );

  const extractFeatures = useCallback(
    (imageData, width, height, models = []) => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'));
          return;
        }

        const requestId = ++requestIdRef.current;
        pendingCallbacksRef.current.set(requestId, { resolve, reject });

        try {
          workerRef.current.postMessage({
            requestId,
            command: 'extractFeatures',
            payload: { imageData, width, height, models }
          });
        } catch (error) {
          pendingCallbacksRef.current.delete(requestId);
          reject(error);
        }
      });
    },
    []
  );

  return {
    analyzeImage,
    processFrame,
    extractFeatures,
    isWorkerReady: workerRef.current !== null
  };
}