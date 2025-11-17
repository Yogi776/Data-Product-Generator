'use client';

import { useEffect } from 'react';

export type ToastType = 'error' | 'warning' | 'success' | 'info';

export interface ToastProps {
  type: ToastType;
  message: string;
  details?: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({ type, message, details, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const styles = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-500',
      text: 'text-red-900',
      icon: '❌'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-500',
      text: 'text-yellow-900',
      icon: '⚠️'
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-500',
      text: 'text-green-900',
      icon: '✅'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      text: 'text-blue-900',
      icon: 'ℹ️'
    }
  };

  const style = styles[type];

  return (
    <div
      className={`fixed top-4 right-4 max-w-md p-4 border-l-4 ${style.bg} ${style.border} rounded-lg shadow-xl z-50 animate-slide-in`}
      role="alert"
    >
      <div className="flex items-start">
        <span className="text-2xl mr-3">{style.icon}</span>
        <div className="flex-1">
          <h4 className={`font-bold ${style.text}`}>{message}</h4>
          {details && (
            <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{details}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close notification"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  details?: string;
  duration?: number;
}

export interface ToastContainerProps {
  toasts: ToastData[];
  removeToast: (id: string) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          details={toast.details}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

