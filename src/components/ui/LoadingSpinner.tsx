import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  /** Text to display below the spinner */
  message?: string;
  /** Whether to take full screen height */
  fullScreen?: boolean;
}

export function LoadingSpinner({ message = 'טוען...', fullScreen = true }: LoadingSpinnerProps) {
  const containerClass = fullScreen
    ? 'min-h-screen bg-slate-50 flex items-center justify-center'
    : 'flex items-center justify-center py-12';

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-4 text-purple-600">
        <Loader2 size={40} className="animate-spin" />
        <p className="font-medium text-lg">{message}</p>
      </div>
    </div>
  );
}
