// Categorías de gastos por defecto que se asignan a CADA usuario nuevo.
// Cada usuario recibe su propia copia (editable/eliminable sin afectar a los demás).
export const DEFAULT_CATEGORIES: { name: string; color: string; icon: string }[] = [
  { name: 'Alquiler', color: '#f59e0b', icon: 'receipt' },
  { name: 'Combustible', color: '#FF90BB', icon: 'receipt' },
  { name: 'Consumos', color: '#6b7280', icon: 'receipt' },
  { name: 'Cuotas tarjeta', color: '#ef4444', icon: 'receipt' },
  { name: 'Educación', color: '#8b5cf6', icon: 'receipt' },
  { name: 'Gimnasio', color: '#FF69B4', icon: 'receipt' },
  { name: 'Impuestos', color: '#FF9149', icon: 'receipt' },
  { name: 'Internet', color: '#10b981', icon: 'receipt' },
  { name: 'Otros', color: '#6b7280', icon: 'receipt' },
  { name: 'Perfumería', color: '#A19AD3', icon: 'receipt' },
  { name: 'Seguridad', color: '#60B5FF', icon: 'receipt' },
  { name: 'Seguros', color: '#80D8C3', icon: 'receipt' },
  { name: 'Servicios', color: '#FF9898', icon: 'receipt' },
  { name: 'Software/IA', color: '#FF6363', icon: 'receipt' },
  { name: 'Suscripciones', color: '#06b6d4', icon: 'receipt' },
  { name: 'Telefonía', color: '#3b82f6', icon: 'receipt' },
];
