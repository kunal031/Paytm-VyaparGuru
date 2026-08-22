import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { CHART, compactINR, shortDate } from '../../utils/chartTheme.js';
import { formatPaise } from '../../utils/format.js';

export default function RevenueProfitChart({ series }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
        <CartesianGrid stroke={CHART.grid} strokeDasharray="0" vertical={false} />
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
          formatter={(value, name) => [formatPaise(value), name]}
          labelFormatter={shortDate}
          contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: CHART.grid }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART.ink }} iconType="plainline" />
        <Line
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke={CHART.series1}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="profit"
          name="Profit"
          stroke={CHART.series2}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
