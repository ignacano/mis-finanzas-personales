import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 md:p-8 lg:p-10 pt-16 lg:pt-10 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
