export async function logout() {
  await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function getActiveUserCount(token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/active/count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch active user count');
  return res.json();
}

