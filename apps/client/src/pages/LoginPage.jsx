import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useLogin } from '../features/auth/authApi.js';
import { useAuthStore } from '../store/authStore.js';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';

export default function LoginPage() {
  const token = useAuthStore((s) => s.token);
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identifier: '', password: '' });

  if (token) return <Navigate to="/dashboard" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    login.mutate(form, {
      onSuccess: () => navigate(location.state?.from || '/dashboard', { replace: true }),
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-navy to-blue-950 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-6 text-center">
          <span className="mb-2 inline-block rounded-xl bg-brand-navy px-3 py-2 text-lg font-extrabold text-white">Vy</span>
          <h1 className="text-2xl font-bold text-brand-navy">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your VyaparGuru account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email or Phone"
            placeholder="ramesh@sharmastore.in"
            value={form.identifier}
            onChange={(e) => setForm({ ...form, identifier: e.target.value })}
            required
            autoFocus
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          {login.isError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{login.error.message}</p>
          )}

          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          New to VyaparGuru?{' '}
          <Link to="/signup" className="font-semibold text-brand-navy hover:underline">
            Create an account
          </Link>
        </p>

        <p className="mt-4 rounded-lg bg-brand-sky px-3 py-2 text-center text-xs text-slate-600">
          Demo: <b>ramesh@sharmastore.in</b> / <b>Paytm@123</b>
        </p>
      </div>
    </div>
  );
}
