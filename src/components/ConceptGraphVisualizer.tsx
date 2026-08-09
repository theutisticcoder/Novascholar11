import React, { useState, useEffect } from "react";
import { Info, HelpCircle } from "lucide-react";
import { ConceptGraph, ConceptNode } from "../types";

interface ConceptGraphVisualizerProps {
  graph: ConceptGraph;
}

export default function ConceptGraphVisualizer({ graph }: ConceptGraphVisualizerProps) {
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ConceptNode | null>(null);

  // Set first node as default selected node
  useEffect(() => {
    if (graph.nodes && graph.nodes.length > 0) {
      setSelectedNode(graph.nodes[0]);
    } else {
      setSelectedNode(null);
    }
  }, [graph]);

  // Width and Height of the SVG workspace
  const width = 600;
  const height = 400;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 130; // Radius of the nodes circular placement

  const nodePositions: { [id: string]: { x: number; y: number } } = {};

  if (graph.nodes && graph.nodes.length > 0) {
    const N = graph.nodes.length;
    graph.nodes.forEach((node, i) => {
      // Calculate coordinates around a circle for clean, symmetrical layout
      const angle = (2 * Math.PI * i) / N - Math.PI / 2; // start from 12 o'clock
      nodePositions[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
  }

  return (
    <div className="bg-bento-bg border border-bento-secondary/20 rounded-3xl p-5 space-y-4 shadow-inner">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-widest text-bento-primary">
          Multimedia Conceptual Diagram: {graph.title}
        </h4>
        <div className="flex items-center gap-1.5 text-[10px] text-bento-text-muted font-bold">
          <Info className="w-3.5 h-3.5" />
          <span>Click nodes to inspect semantic concepts</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Interactive SVG Canvas (7 columns) */}
        <div className="lg:col-span-8 bg-bento-card border border-bento-secondary/10 rounded-2xl overflow-hidden relative p-2 flex items-center justify-center">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto max-h-[300px] select-none"
          >
            {/* Definitions / Marker Filters for clean link arrows */}
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="25"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#00f2fe" opacity="0.6" />
              </marker>
            </defs>

            {/* Draw Links/Edges */}
            {graph.links &&
              graph.links.map((link, idx) => {
                const sourcePos = nodePositions[link.source];
                const targetPos = nodePositions[link.target];
                if (!sourcePos || !targetPos) return null;

                const isPathActive =
                  (selectedNode && (selectedNode.id === link.source || selectedNode.id === link.target)) ||
                  (hoveredNode && (hoveredNode.id === link.source || hoveredNode.id === link.target));

                return (
                  <g key={`link-${idx}`}>
                    {/* Glowing background line for active paths */}
                    {isPathActive && (
                      <line
                        x1={sourcePos.x}
                        y1={sourcePos.y}
                        x2={targetPos.x}
                        y2={targetPos.y}
                        stroke="#66f2f1"
                        strokeWidth="5"
                        strokeOpacity="0.15"
                        className="transition-all duration-300"
                      />
                    )}
                    {/* Core connection link */}
                    <line
                      x1={sourcePos.x}
                      y1={sourcePos.y}
                      x2={targetPos.x}
                      y2={targetPos.y}
                      stroke={isPathActive ? "#66f2f1" : "rgba(102,252,241,0.2)"}
                      strokeWidth={isPathActive ? "2" : "1.2"}
                      strokeDasharray={isPathActive ? "none" : "4 3"}
                      markerEnd="url(#arrow)"
                      className="transition-all duration-300"
                    />

                    {/* Mid-point Relationship Text Badge */}
                    <g transform={`translate(${(sourcePos.x + targetPos.x) / 2}, ${(sourcePos.y + targetPos.y) / 2})`}>
                      <rect
                        x="-45"
                        y="-7"
                        width="90"
                        height="14"
                        rx="4"
                        fill="#0b0c10"
                        stroke={isPathActive ? "#66f2f1" : "rgba(102,252,241,0.1)"}
                        strokeWidth="0.8"
                        opacity="0.9"
                      />
                      <text
                        fill={isPathActive ? "#66f2f1" : "#8f94a5"}
                        fontSize="8"
                        fontWeight="bold"
                        textAnchor="middle"
                        y="2.5"
                        className="tracking-wider"
                      >
                        {link.relationship}
                      </text>
                    </g>
                  </g>
                );
              })}

            {/* Draw Nodes */}
            {graph.nodes &&
              graph.nodes.map((node) => {
                const pos = nodePositions[node.id];
                if (!pos) return null;

                const isSelected = selectedNode && selectedNode.id === node.id;
                const isHovered = hoveredNode && hoveredNode.id === node.id;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    className="cursor-pointer"
                    onClick={() => setSelectedNode(node)}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* Node ambient pulse aura */}
                    <circle
                      r={18 + (node.val * 0.8)}
                      fill="url(#nodeGlow)"
                      className={`transition-all duration-300 ${
                        isSelected ? "scale-125 opacity-25" : "scale-100 opacity-0"
                      }`}
                      style={{
                        animation: isSelected ? "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite" : "none"
                      }}
                    />

                    {/* Outer Glowing Border */}
                    <circle
                      r={18 + (node.val * 0.8)}
                      fill="#0b0c10"
                      stroke={isSelected ? "#66f2f1" : isHovered ? "#00f2fe" : "rgba(102,252,241,0.35)"}
                      strokeWidth={isSelected ? "2.5" : "1.2"}
                      className="transition-all duration-300 shadow-md"
                    />

                    {/* Circle Node Inner Core */}
                    <circle
                      r={14 + (node.val * 0.6)}
                      fill={isSelected ? "rgba(102,252,241,0.15)" : "rgba(11,12,16,0.8)"}
                      className="transition-all duration-300"
                    />

                    {/* Center Code Letter or Label */}
                    <text
                      textAnchor="middle"
                      y="3.5"
                      fill={isSelected || isHovered ? "#ffffff" : "#66f2f1"}
                      fontSize="9"
                      fontWeight="black"
                      className="font-sans select-none tracking-wider pointer-events-none"
                    >
                      {node.id}
                    </text>

                    {/* Floating Hover Label */}
                    <text
                      textAnchor="middle"
                      y={-(25 + (node.val * 0.8))}
                      fill={isSelected ? "#66f2f1" : "#ffffff"}
                      fontSize="9"
                      fontWeight="extrabold"
                      className="transition-all duration-300 select-none pointer-events-none opacity-90 filter drop-shadow"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
          </svg>
        </div>

        {/* Selected Node Details Side Pane (4 columns) */}
        <div className="lg:col-span-4 h-full flex flex-col justify-between">
          <div className="bg-bento-card border border-bento-secondary/15 p-4 rounded-2xl h-full space-y-3.5 flex flex-col justify-center">
            {selectedNode ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-bento-primary/10 border border-bento-primary/30 text-bento-primary flex items-center justify-center text-xs font-black shrink-0">
                    {selectedNode.id}
                  </span>
                  <h5 className="text-sm font-extrabold text-white leading-tight">
                    {selectedNode.label}
                  </h5>
                </div>

                <p className="text-xs text-bento-text-muted leading-relaxed font-medium">
                  {selectedNode.description}
                </p>

                <div className="pt-2 border-t border-bento-secondary/10 flex items-center justify-between text-[10px]">
                  <span className="text-bento-secondary font-bold uppercase tracking-wider">Concept Weight:</span>
                  <span className="font-black text-bento-primary px-2 py-0.5 bg-bento-primary/10 border border-bento-primary/25 rounded-lg">
                    Level {selectedNode.val}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-bento-text-muted space-y-1.5">
                <HelpCircle className="w-8 h-8 mx-auto text-bento-secondary/35" />
                <p className="text-xs font-bold">No concept node selected</p>
                <p className="text-[10px] text-bento-text-muted/75">Select any circle inside the conceptual graph diagram.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
