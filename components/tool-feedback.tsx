interface ToolFeedbackProps {
  message: string;
}

export function ToolFeedback({ message }: ToolFeedbackProps) {
  return (
    <div
      className="mb-4 p-4 bg-surface border border-border rounded-lg relative overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label="Tool status"
    >
      <div className="flex items-center gap-3 relative z-10">
        <div className="flex-shrink-0">
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
        </div>
        <p className="text-sm text-muted">{message}</p>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
    </div>
  );
}

