import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <p className="text-6xl font-extrabold text-brand-navy">404</p>
      <p className="mt-2 text-slate-500">This page doesn't exist.</p>
      <Link to="/dashboard" className="mt-4 font-semibold text-brand-blue hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
