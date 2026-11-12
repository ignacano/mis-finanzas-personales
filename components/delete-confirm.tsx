'use client';
import { Trash2, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
}

export function DeleteConfirm({ open, onClose, onConfirm, title = '¿Eliminar este registro?' }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">Esta acción no se puede deshacer.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition text-sm flex items-center gap-2">
            <X size={16} /> Cancelar
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition text-sm flex items-center gap-2">
            <Trash2 size={16} /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
