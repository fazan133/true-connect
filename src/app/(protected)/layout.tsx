import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { AuthProvider } from '@/components/auth/auth-provider';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <Sidebar />
        <Header />
        <main className="lg:pl-64 pb-20 lg:pb-0">
          <div className="max-w-2xl mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>
    </AuthProvider>
  );
}
