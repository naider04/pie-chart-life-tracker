import React from 'react';
import { CategoryDistribution } from '../types';

interface PieChartProps {
  title: string;
  subtitle?: string;
  data: CategoryDistribution[];
  size?: number;
  selectedCategoryId?: string | null;
  onSelectCategory?: (categoryId: string) => void;
  className?: string;
}

export const PieChart: React.FC<PieChartProps> = ({
  title,
  subtitle,
  data,
  size = 195,
  selectedCategoryId,
  onSelectCategory,
  className = '',
}) => {
  const center = size / 2;
  const radius = (size / 2) * 0.90;

  // Calculate SVG arc paths and label positions for solid pie chart
  let cumulativeAngle = -Math.PI / 2; // Start from top (12 o'clock)

  const slices = data.map(item => {
    const fraction = item.percentage / 100;
    const angle = fraction * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const isFullCircle = fraction >= 0.999;

    // Outer arc coords
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const largeArc = angle > Math.PI ? 1 : 0;

    let pathData = '';
    if (isFullCircle) {
      pathData = `
        M ${center} ${center - radius}
        A ${radius} ${radius} 0 1 0 ${center} ${center + radius}
        A ${radius} ${radius} 0 1 0 ${center} ${center - radius}
        Z
      `;
    } else {
      pathData = `
        M ${center} ${center}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
        Z
      `;
    }

    // Centroid placement for slice text (name + percentage)
    const centerAngle = startAngle + angle / 2;
    // Slices centroid is ~62% from center along the angle bisector
    const labelRadius = radius * 0.62;
    const labelX = center + labelRadius * Math.cos(centerAngle);
    const labelY = center + labelRadius * Math.sin(centerAngle);

    const isSelected = selectedCategoryId === item.categoryId;

    return {
      item,
      pathData,
      labelX,
      labelY,
      fraction,
      isSelected,
    };
  });

  return (
    <div className={`flex flex-col items-center justify-between bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3 shadow-sm h-full select-none ${className}`}>
      {/* Header */}
      <div className="text-center w-full pb-1">
        <h3 className="font-bold text-neutral-100 text-xs md:text-sm tracking-tight truncate">{title}</h3>
        {subtitle && <p className="text-[10px] text-neutral-400 truncate leading-tight mt-0.5">{subtitle}</p>}
      </div>

      {/* Solid Pie Chart (No donut hole) */}
      <div className="relative flex items-center justify-center my-auto" style={{ width: size, height: size }}>
        {data.length === 0 ? (
          <div className="w-full h-full rounded-full border-2 border-dashed border-neutral-800 flex items-center justify-center p-3 text-center">
            <span className="text-[11px] text-neutral-500 font-medium">Add 2+ categories</span>
          </div>
        ) : (
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="overflow-visible"
          >
            <g>
              {slices.map(({ item, pathData, isSelected, labelX, labelY, fraction }) => (
                <g key={item.categoryId}>
                  {/* Solid slice without hole */}
                  <path
                    d={pathData}
                    fill={item.color}
                    opacity={isSelected ? 1 : 0.9}
                    stroke={isSelected ? '#ffffff' : '#0a0a0a'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    className="cursor-pointer"
                    onClick={() => onSelectCategory && onSelectCategory(item.categoryId)}
                  >
                    <title>{`${item.name}: ${item.percentage}% (Click to focus comparisons)`}</title>
                  </path>

                  {/* Category Name Label and Percentage directly on the slice */}
                  {fraction >= 0.08 ? (
                    <g pointerEvents="none">
                      {/* Category Name */}
                      <text
                        x={labelX}
                        y={labelY - 7}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="font-bold text-[11px] fill-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                      >
                        {item.name.length > 9 ? item.name.substring(0, 8) + '…' : item.name}
                      </text>
                      {/* Percentage */}
                      <text
                        x={labelX}
                        y={labelY + 8}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="font-mono font-bold text-[12px] fill-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                      >
                        {Math.round(item.percentage)}%
                      </text>
                    </g>
                  ) : fraction >= 0.04 ? (
                    /* Narrow slice: show percentage only */
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      pointerEvents="none"
                      className="font-mono font-bold text-[10px] fill-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                    >
                      {Math.round(item.percentage)}%
                    </text>
                  ) : null}
                </g>
              ))}
            </g>
          </svg>
        )}
      </div>
    </div>
  );
};
