'use client';

interface DiagramNode {
  id: string;
  label: string;
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

interface DiagramEdge {
  from: string;
  to: string;
}

interface HelpDiagramProps {
  type: 'flow' | 'hierarchy';
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

const colorClasses = {
  primary: 'fill-primary-100 stroke-primary-600',
  success: 'fill-green-100 stroke-green-600',
  warning: 'fill-yellow-100 stroke-yellow-600',
  danger: 'fill-red-100 stroke-red-600',
};

export function HelpDiagram({ type, nodes, edges }: HelpDiagramProps) {
  const nodeWidth = 120;
  const nodeHeight = 50;
  const horizontalGap = 60;
  const verticalGap = 80;

  // Calculate SVG dimensions based on nodes
  const cols = type === 'flow' ? nodes.length : Math.ceil(Math.sqrt(nodes.length));
  const rows = type === 'flow' ? 1 : Math.ceil(nodes.length / cols);

  const width = cols * nodeWidth + (cols - 1) * horizontalGap + 40;
  const height = rows * nodeHeight + (rows - 1) * verticalGap + 40;

  // Position nodes
  const nodePositions = nodes.map((node, index) => {
    const col = type === 'flow' ? index : index % cols;
    const row = type === 'flow' ? 0 : Math.floor(index / cols);

    return {
      ...node,
      x: 20 + col * (nodeWidth + horizontalGap),
      y: 20 + row * (nodeHeight + verticalGap),
    };
  });

  return (
    <div className="my-6 flex justify-center">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="max-w-full h-auto"
        style={{ maxHeight: '400px' }}
      >
        {/* Draw edges first (behind nodes) */}
        {edges.map((edge, index) => {
          const fromNode = nodePositions.find((n) => n.id === edge.from);
          const toNode = nodePositions.find((n) => n.id === edge.to);

          if (!fromNode || !toNode) return null;

          const x1 = fromNode.x + nodeWidth;
          const y1 = fromNode.y + nodeHeight / 2;
          const x2 = toNode.x;
          const y2 = toNode.y + nodeHeight / 2;

          return (
            <g key={index}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#64748b"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            </g>
          );
        })}

        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#64748b" />
          </marker>
        </defs>

        {/* Draw nodes */}
        {nodePositions.map((node) => {
          const colorClass = colorClasses[node.color || 'primary'];

          return (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width={nodeWidth}
                height={nodeHeight}
                rx="8"
                className={colorClass}
                strokeWidth="2"
              />
              <text
                x={node.x + nodeWidth / 2}
                y={node.y + nodeHeight / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-sm font-semibold"
                fill="#1e293b"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
