import React, { createContext, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
              className={`pointer-events-auto p-3.5 rounded-xl border shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200 ${
              t.type === 'success'
                ? 'bg-surface border-success/50 text-success'
                : t.type === 'error'
                ? 'bg-surface border-error/50 text-error'
                : 'bg-surface border-border text-secondary'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
            ) : t.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-error mt-0.5 flex-shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
            )}

            <div className="flex-1 text-xs leading-relaxed">{t.message}</div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-secondary hover:text-ivory transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { addToast: (msg) => alert(msg) };
  }
  return ctx;
}
