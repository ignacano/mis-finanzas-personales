'use client';
import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  options?: { value: string; label: string }[];
  required?: boolean;
  step?: string;
  readOnly?: boolean;
  helpText?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  // Si devuelve false, el campo se oculta segun el estado actual del formulario.
  visible?: (form: Record<string, any>) => boolean;
}

interface EditModalProps {
  title: string;
  fields: FieldConfig[];
  initialData?: Record<string, any>;
  onSave: (data: Record<string, any>) => Promise<void>;
  onClose: () => void;
  open: boolean;
  // Recalcula campos derivados en tiempo real a partir del formulario actual.
  compute?: (form: Record<string, any>) => Record<string, any>;
}

export function EditModal({ title, fields, initialData, onSave, onClose, open, compute }: EditModalProps) {
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const init: Record<string, any> = {};
      fields.forEach((f: FieldConfig) => {
        let val = initialData?.[f.name] ?? '';
        if (f.type === 'date' && val) {
          val = new Date(val).toISOString().split('T')[0];
        }
        init[f.name] = val;
      });
      const withDerived = compute ? { ...init, ...compute(init) } : init;
      setForm(withDerived);
    }
  }, [open, initialData, fields, compute]);

  if (!open) return null;

  const updateField = (name: string, value: any) => {
    setForm((prev: Record<string, any>) => {
      const next = { ...(prev ?? {}), [name]: value };
      return compute ? { ...next, ...compute(next) } : next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const parsed = { ...(form ?? {}) };
      fields.forEach((f: FieldConfig) => {
        if (f.type === 'number' && parsed[f.name] !== '' && parsed[f.name] !== undefined) {
          parsed[f.name] = Number(parsed[f.name]);
        }
      });
      await onSave(parsed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-display font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {(fields ?? []).filter((f: FieldConfig) => !f.visible || f.visible(form ?? {})).map((f: FieldConfig) => (
            <div key={f.name}>
              <label className="text-sm font-medium block mb-1">{f.label}</label>
              {f.type === 'select' ? (
                <select
                  value={form?.[f.name] ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField(f.name, e.target.value)}
                  className="w-full px-3 py-2 bg-muted rounded-lg border border-input text-foreground outline-none focus:ring-2 focus:ring-primary"
                  required={f.required}
                  disabled={f.readOnly}
                >
                  <option value="">Seleccionar...</option>
                  {(f.options ?? []).map((o: { value: string; label: string }) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  value={form?.[f.name] ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField(f.name, e.target.value)}
                  className="w-full px-3 py-2 bg-muted rounded-lg border border-input text-foreground outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                  required={f.required}
                />
              ) : (
                <input
                  type={f.type}
                  value={form?.[f.name] ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField(f.name, e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border border-input text-foreground outline-none focus:ring-2 focus:ring-primary ${f.readOnly ? 'bg-muted/50 cursor-not-allowed text-muted-foreground' : 'bg-muted'}`}
                  required={f.required}
                  step={f.step}
                  min={f.min}
                  max={f.max}
                  readOnly={f.readOnly}
                  placeholder={f.placeholder}
                />
              )}
              {f.helpText && <p className="text-xs text-muted-foreground mt-1">{f.helpText}</p>}
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition text-sm">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition text-sm flex items-center gap-2 disabled:opacity-50">
              <Save size={16} />{saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
