import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { AuthProvider } from '@/components/auth/auth-provider';
import { Sidebar } from '@/components/layout/sidebar';

export default async function MessagesLayout({
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
        <main className="lg:pl-64 h-screen">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
