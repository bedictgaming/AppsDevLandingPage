import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

/**
 * Hook to sync authentication state across browser tabs using JWT validation
 * Checks if Bearer token is valid and determines user type (admin or regular user)
 * If token is valid, redirect to appropriate dashboard
 */
export function useAuthSync() {
  const router = useRouter();

  useEffect(() => {
    const validateAndSync = async () => {
      const userToken = typeof window !== 'undefined' ? localStorage.getItem('userToken') : null;
      const adminLoggedIn = typeof window !== 'undefined' ? localStorage.getItem('adminLoggedIn') : null;
      const adminToken = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;

      try {
        // Check if user token exists and is valid
        if (userToken) {
          try {
            const response = await axios.get('http://localhost:5000/auth/profile', {
              headers: {
                Authorization: `Bearer ${userToken}`,
              },
            });

            // Token is valid, user is logged in
            if (response.data) {
              router.push('/dashboard');
              return;
            }
          } catch (err: any) {
            // Token is invalid/expired, remove it
            if (err.response?.status === 401 || err.response?.status === 403) {
              localStorage.removeItem('userToken');
              localStorage.removeItem('studentId');
            }
          }
        }

        // Check if admin token exists and is valid
        if (adminToken || adminLoggedIn) {
          try {
            const response = await axios.get('http://localhost:5000/auth/profile', {
              headers: {
                Authorization: `Bearer ${adminToken || ''}`,
              },
            });

            // Token is valid, admin is logged in
            if (response.data) {
              router.push('/admin/portal');
              return;
            }
          } catch (err: any) {
            // Token is invalid/expired, remove it
            if (err.response?.status === 401 || err.response?.status === 403) {
              localStorage.removeItem('adminLoggedIn');
              localStorage.removeItem('adminStudentId');
              localStorage.removeItem('adminToken');
            }
          }
        }
      } catch (error) {
        console.error('Auth validation error:', error);
      }
    };

    validateAndSync();

    // Listen for storage changes (login/logout from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userToken' || e.key === 'adminToken' || e.key === 'adminLoggedIn') {
        // Re-validate when storage changes
        validateAndSync();
      }
    };

    // Listen for custom logout events
    const handleLogout = () => {
      router.push('/');
    };

    const handleAdminLogout = () => {
      router.push('/admin/login');
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('user-logout', handleLogout);
    window.addEventListener('admin-logout', handleAdminLogout);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-logout', handleLogout);
      window.removeEventListener('admin-logout', handleAdminLogout);
    };
  }, [router]);
}

/**
 * Verify JWT token validity
 * Returns true if token is valid, false otherwise
 */
export async function verifyToken(token: string): Promise<boolean> {
  try {
    const response = await axios.get('http://localhost:5000/auth/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return !!response.data;
  } catch (error) {
    return false;
  }
}

/**
 * Dispatch user logout event across all tabs
 */
export function dispatchLogoutEvent() {
  localStorage.removeItem('userToken');
  localStorage.removeItem('studentId');
  window.dispatchEvent(new CustomEvent('user-logout'));
}

/**
 * Dispatch admin logout event across all tabs
 */
export function dispatchAdminLogoutEvent() {
  localStorage.removeItem('adminLoggedIn');
  localStorage.removeItem('adminStudentId');
  localStorage.removeItem('adminToken');
  window.dispatchEvent(new CustomEvent('admin-logout'));
}
