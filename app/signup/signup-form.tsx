'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserPlus, LogIn } from 'lucide-react';
import { Logo } from '@/components/logo';
import Link from 'next/link';

export function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Error al crear cuenta');
        setLoading(false);
        return;
      }
      const loginRes = await signIn('credentials', { email, password, redirect: false });
      if (loginRes?.error) {
        setError('Cuenta creada. Error al iniciar sesión automáticamente.');
        setLoading(false);
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Error del servidor');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size={64} />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Crear cuenta</h1>
          <p className="text-muted-foreground mt-2">Registrate en MisFinanzas</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-muted rounded-lg border border-input text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-muted rounded-lg border border-input text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 bg-muted rounded-lg border border-input text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserPlus size={18} />
              {loading ? 'Creando...' : 'Crear cuenta'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <LogIn size={14} /> Ya tengo cuenta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
