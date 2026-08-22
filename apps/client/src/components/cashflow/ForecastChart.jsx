import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import { CHART, compactINR, shortDate } from '../../utils/chartTheme.js';
import { formatPaise } from '../../utils/format.js';

/**
 * Net cash flow forecast: recent history (solid) + forecast (dashed) with an
 * 80% confidence band; festival days marked with reference lines.
 */
export default function ForecastChart({ history, forecast, festivals }) {
  // Stitch: last 30 days of history + forecast horizon on one axis
  const recent = history.slice(-30).map((p) => ({ date: p.date, actual: p.net }));
  const future = forecast.map((p) => ({
    date: p.date,
    yhat: p.yhat,
    band: [p.yhatLower, p.yhatUpper],
  }));
  // Join point so the dashed line continues from the last actual
  if (recent.length && future.length) {
    future.unshift({ date: recent[recent.length - 1].date, yhat: recent[recent.length - 1].actual });
  }
  const merged = [...recent];
  for (const f of future) {
    const existing = merged.find((m) => m.date === f.date);
    if (existing) Object.assign(existing, f);
    else merged.push(f);
  }

  // At most 3 festival markers to keep labels legible
  const markers = (festivals || []).slice(0, 3);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={merged} margin={{ top: 20, right: 8, bottom: 0, left: 4 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tick={{ fill: CHART.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: CHART.grid }}
          minTickGap={40}
        />
        <YAxis
          tickFormatter={compactINR}
          tick={{ fill: CHART.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={58}
        />
        <Tooltip
          formatter={(value, name) => {
            if (Array.isArray(value)) {
              return [`${formatPaise(value[0])} – ${formatPaise(value[1])}`, '80% range'];
            }
            return [formatPaise(value), name === 'actual' ? 'Actual net' : 'Forecast net'];
          }}
          labelFormatter={shortDate}
          contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: CHART.grid }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: CHART.ink }}
          payload={[
            {
              value: 'Actual net',
              type: 'plainline',
              color: CHART.series1,
              id: 'a',
              payload: { strokeDasharray: '0' },
            },
            {
              value: 'Forecast (80% band)',
              type: 'plainline',
              color: CHART.series2,
              id: 'f',
              payload: { strokeDasharray: '6 4' },
            },
          ]}
        />
        <Area dataKey="band" stroke="none" fill={CHART.band} fillOpacity={0.7} name="80% range" />
        <Line
          type="monotone"
          dataKey="actual"
          stroke={CHART.series1}
          strokeWidth={2}
          dot={false}
          name="actual"
        />
        <Line
          type="monotone"
          dataKey="yhat"
          stroke={CHART.series2}
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
          name="yhat"
        />
        {markers.map((f, idx) => (
          <ReferenceLine
            key={f.date}
            x={f.date}
            stroke={CHART.axis}
            strokeDasharray="3 3"
            label={{
              value: f.name,
              position: 'insideTopLeft',
              dy: idx * 13, // stagger so nearby festival labels don't collide
              fill: CHART.ink,
              fontSize: 10,
            }}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
