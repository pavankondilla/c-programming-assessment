export type Session = { role: 'student'; name: string };

// These credentials are part of the public JavaScript bundle on GitHub Pages.
const accounts: Record<string, { password: string; name: string }> = {
  vishal: { password: 'vishal@exam', name: 'vishal' },
  vaishu: { password: 'vaishu123@', name: 'vaishu' },
};

export function authenticate(username: string, password: string): Session | null {
  const account = accounts[username.trim().toLowerCase()];
  return account?.password === password ? { role: 'student', name: account.name } : null;
}
