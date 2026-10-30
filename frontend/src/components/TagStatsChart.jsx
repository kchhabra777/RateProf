import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { getTagTheme } from '../lib/tagTheme';

// Community tag frequencies for a teacher. Lazily loaded so recharts stays out of the dashboard bundle.
export default function TagStatsChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
      >
        <XAxis type="number" hide domain={[0, 100]} />
        <YAxis 
          type="category" 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          width={160}
          tick={({ x, y, payload }) => (
            <text
              x={x}
              y={y}
              dy={4}
              textAnchor="end"
              fill="var(--text-primary)"
              fontSize={11.5}
              fontWeight={600}
            >
              {payload.value}
            </text>
          )}
        />
        <Tooltip 
          cursor={{ fill: 'var(--bg-card-subtle)' }} 
          contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-light)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
          itemStyle={{ fontWeight: 700 }}
          formatter={(val) => [`${val}%`, 'Frequency']}
        />
        <Bar 
          dataKey="percentage" 
          radius={[6, 6, 6, 6]} 
          barSize={12} 
          background={{ fill: 'var(--bg-card-subtle)', radius: [6, 6, 6, 6] }}
          label={{ position: 'right', fill: 'var(--text-primary)', fontSize: 12, fontWeight: 700, formatter: (val) => `${val}%` }}
        >
          {data.map((entry, index) => {
            const theme = getTagTheme(entry.name);
            return (
              <Cell 
                key={`cell-${index}`} 
                fill={theme.color} 
                style={{ filter: `drop-shadow(0 0 6px ${theme.border})` }} 
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
