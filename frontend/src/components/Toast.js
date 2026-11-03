import React, { useEffect } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import './Toast.css';

export { default as useToast } from './useToast';

export function ToastProvider({ children }) {
  return <>{children}</>;
}

export default function Toast({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(onRemove, 3500);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const icons = {
    success: <FaCheckCircle />,
    error:   <FaExclamationCircle />,
    info:    <FaInfoCircle />,
  };

  return (
    <div className={`toast-item toast-${toast.type}`}>
      <span className="toast-icon">{icons[toast.type] || icons.info}</span>
      <span className="toast-msg">{toast.message}</span>
      <button className="toast-close" onClick={onRemove}><FaTimes /></button>
    </div>
  );
}
