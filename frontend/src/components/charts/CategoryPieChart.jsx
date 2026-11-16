import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { getCategoryLabel } from '../../utils/formatters';

const COLORS = ['#0284c7', '#f97316', '#eab308', '#8b5cf6', '#ec4899', '#64748b'];

export default function CategoryPieChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
        No category data available
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: getCategoryLabel(d.category),
    value: d.count
  }));

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(val) => <span style={{ fontSize: '0.8rem', color: '#475569' }}>{val}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

