import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useSignup } from '../features/auth/authApi.js';
import { useAuthStore } from '../store/authStore.js';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';

const BUSINESS_TYPES = [
  { value: 'kirana', label: 'Kirana / Retail Store' },
  { value: 'd2c', label: 'D2C Brand' },
  { value: 'manufacturer', label: 'Manufacturer' },
];

export default function SignupPage() {
  const token = useAuthStore((s) => s.token);
  const signup = useSignup();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    businessName: '',
    ownerName: '',
    phone: '',
    email: '',
    password: '',
    businessType: 'kirana',
    city: '',
    state: '',
  });

  if (token) return <Navigate to="/dashboard" replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    const { city, state, ...rest } = form;
    signup.mutate(
      { ...rest, location: { city, state } },
      { onSuccess: () => navigate('/dashboard', { replace: true }) }
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-navy to-blue-950 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-brand-navy">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">Your AI co-pilot for business growth</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Business Name" value={form.businessName} onChange={set('businessName')} required />
            <Input label="Owner Name" value={form.ownerName} onChange={set('ownerName')} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Phone" type="tel" placeholder="10-digit mobile" value={form.phone} onChange={set('phone')} required />
            <Input label="Email" type="email" value={form.email} onChange={set('email')} required />
          </div>
          <Input
            label="Password"
            type="password"
            placeholder="Min 8 characters"
            value={form.password}
            onChange={set('password')}
            required
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Business Type</span>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
              value={form.businessType}
              onChange={set('businessType')}
            >
              {BUSINESS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="City" value={form.city} onChange={set('city')} />
            <Input label="State" value={form.state} onChange={set('state')} />
          </div>

          {signup.isError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <p>{signup.error.message}</p>
              {signup.error.details?.map((d) => (
                <p key={d} className="mt-0.5 text-xs">
                  • {d}
                </p>
              ))}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={signup.isPending}>
            {signup.isPending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-navy hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
