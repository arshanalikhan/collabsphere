'use client';

// Submit button that asks before running a destructive server action
export default function ConfirmButton({ message, children, className = 'ghost' }) {
  return (
    <button className={className} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
