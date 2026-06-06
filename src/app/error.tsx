'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Algo salió mal</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Hubo un error inesperado en la aplicación. Intentá refrescar.
        </p>
        <p className="text-xs text-muted-foreground/60">
          {error?.message || 'Error desconocido'}
        </p>
      </div>
      <Button
        onClick={() => reset()}
        className="gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Intentar de nuevo
      </Button>
    </div>
  );
}
