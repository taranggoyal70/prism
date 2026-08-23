"use client";

import {
  Braces,
  CheckCircle2,
  GitBranch,
  History,
  Play,
  ShieldCheck,
} from "lucide-react";

import type { DiagramSpec } from "@/lib/schema";

type EvidenceDiagramProps = {
  diagram: DiagramSpec;
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
};

type Point = { x: number; y: number };

const POSITIONS: Point[] = [
  { x: 4, y: 5 },
  { x: 68, y: 6 },
  { x: 5, y: 46 },
  { x: 39, y: 36 },
  { x: 70, y: 72 },
  { x: 38, y: 74 },
  { x: 4, y: 78 },
];

export function EvidenceDiagram({ diagram, selectedNodeId, onSelectNode }: EvidenceDiagramProps) {
  const positions = new Map(
    diagram.nodes.map((node, index) => [node.id, POSITIONS[index] ?? gridFallback(index)]),
  );

  return (
    <section className="living-graph" aria-label={`${diagram.title} behavior graph`}>
      <div className="graph-heading">
        <div>
          <p className="panel-label">Living proof graph</p>
          <h3>Behavior, not filenames</h3>
        </div>
        <div className="graph-legend" aria-label="Graph legend">
          <span><i className="legend-dot current" />Current code</span>
          <span><i className="legend-dot historical" />Project memory</span>
          <span><i className="legend-dot branch" />Decision branch</span>
        </div>
      </div>

      <div className="graph-canvas">
        <svg className="graph-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="graph-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
          </defs>
          {diagram.edges.map((edge) => {
            const source = positions.get(edge.source);
            const target = positions.get(edge.target);
            if (!source || !target) return null;
            const selected = edge.source === selectedNodeId || edge.target === selectedNodeId;
            const negative = /invalid|duplicate|not authorized|no relevant|alternate/i.test(edge.label);
            const sourceNode = diagram.nodes.find((node) => node.id === edge.source);
            const labelPoint = decisionLabelPoint(edge.label, source, target);
            return (
              <g key={`${edge.source}-${edge.target}-${edge.label}`}>
                <path
                  className={`graph-edge${selected ? " selected" : ""}${negative ? " negative" : ""}`}
                  d={connectionPath(source, target)}
                  markerEnd="url(#graph-arrow)"
                />
                {sourceNode?.kind === "decision" ? (
                  <text
                    className={`graph-edge-label${negative ? " negative" : ""}`}
                    x={labelPoint.x}
                    y={labelPoint.y}
                  >
                    {negative ? "else" : "if true"}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {diagram.nodes.map((node, index) => {
          const point = positions.get(node.id)!;
          const selected = node.id === selectedNodeId;
          const isMemory = /memory|decision/i.test(node.label) && node.kind !== "decision";
          return (
            <button
              className={`graph-node ${node.kind}${selected ? " selected" : ""}${isMemory ? " memory" : ""}`}
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              type="button"
              aria-pressed={selected}
            >
              <span className="graph-node-topline">
                <span className="graph-node-number">{index + 1}</span>
                {node.kind === "decision" ? <GitBranch size={17} aria-hidden="true" /> : null}
                {node.kind === "start" ? <Play size={16} aria-hidden="true" /> : null}
                {node.kind === "end" ? <CheckCircle2 size={17} aria-hidden="true" /> : null}
                {node.kind === "process" && isMemory ? <History size={17} aria-hidden="true" /> : null}
                {node.kind === "process" && !isMemory ? <Braces size={17} aria-hidden="true" /> : null}
              </span>
              <strong>{node.label}</strong>
              <span className="graph-node-proof">
                <ShieldCheck size={13} aria-hidden="true" />
                {node.evidenceIds.length} {node.evidenceIds.length === 1 ? "proof" : "proofs"}
              </span>
            </button>
          );
        })}
      </div>

      <p className="sr-only">
        {diagram.edges.map((edge) => `${edge.source} leads to ${edge.target} when ${edge.label}.`).join(" ")}
      </p>
    </section>
  );
}

function connectionPath(source: Point, target: Point): string {
  const startX = source.x + 11;
  const startY = source.y + 8;
  const endX = target.x + 2;
  const endY = target.y + 8;
  const curve = Math.max(5, Math.abs(endX - startX) * 0.42);
  return `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`;
}

function decisionLabelPoint(label: string, source: Point, target: Point): Point {
  if (/invalid/i.test(label)) return { x: 31, y: 39 };
  if (/no relevant/i.test(label)) return { x: 18, y: 70 };
  if (/relevant memory/i.test(label)) return { x: 43, y: 61 };

  const startX = source.x + 11;
  const startY = source.y + 8;
  const endX = target.x + 2;
  const endY = target.y + 8;
  return { x: (startX + endX) / 2, y: (startY + endY) / 2 - 2 };
}

function gridFallback(index: number): Point {
  return { x: 6 + (index % 3) * 31, y: 8 + Math.floor(index / 3) * 29 };
}
