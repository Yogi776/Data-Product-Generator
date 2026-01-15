'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useUserInfo from '@/app/(hooks)/useUserInfo';

export default function RequireLogin({ children }: { children: React.ReactNode }) {
  const { loggedIn } = useUserInfo();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loggedIn === false && pathname !== '/') {
      router.replace('/');
    }
  }, [loggedIn, pathname, router]);

  if (loggedIn === undefined) {
    return (
      <div>
        <div>Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
