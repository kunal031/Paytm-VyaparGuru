import Card from '../components/common/Card.jsx';

export default function ComingSoonPage({ title, phase }) {
  return (
    <Card>
      <div className="py-10 text-center">
        <p className="text-4xl">🚧</p>
        <h2 className="mt-3 text-xl font-bold text-brand-navy">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">This module ships in Phase {phase}. Stay tuned!</p>
      </div>
    </Card>
  );
}
