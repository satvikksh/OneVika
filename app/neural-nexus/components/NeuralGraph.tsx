"use client";

import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

/* =======================
   TYPES
======================= */
export interface NeuralNode {
  id: string;
  active?: boolean;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

export interface NeuralLink {
  source: string | NeuralNode;
  target: string | NeuralNode;
}

interface NeuralGraphProps {
  roomId?: string;
}

/* =======================
   SEEDED RANDOM NUMBER GENERATOR
======================= */
class SeededRandom {
  private seed: number;

  constructor(seed: string) {
    this.seed = 0;
    for (let i = 0; i < seed.length; i++) {
      this.seed = ((this.seed << 5) - this.seed) + seed.charCodeAt(i);
      this.seed = this.seed & this.seed;
    }
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

/* =======================
   OPTIMIZED BRAIN GENERATOR
======================= */
function generateBrain(
  roomId?: string,
  nodeCount = 800,
  linksPerNode = 3
): { nodes: NeuralNode[]; links: NeuralLink[] } {
  const nodes: NeuralNode[] = [];
  const links: NeuralLink[] = [];
  const linkSet = new Set<string>();
  
  const rng = new SeededRandom(roomId || "default-brain-pattern");

  // Generate nodes with seeded randomness
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `neuron-${i}`,
      active: rng.next() > 0.96,
    });
  }

  // Create small-world network with clustering
  for (let i = 0; i < nodeCount; i++) {
    let linksCreated = 0;
    let attempts = 0;
    const maxAttempts = linksPerNode * 3;

    while (linksCreated < linksPerNode && attempts < maxAttempts) {
      attempts++;
      
      // 70% local connections, 30% long-range
      const isLocal = rng.next() < 0.7;
      let target: number;
      
      if (isLocal) {
        const range = Math.floor(nodeCount * 0.05); // 5% of network
        const offset = Math.floor(rng.next() * range * 2) - range;
        target = (i + offset + nodeCount) % nodeCount;
      } else {
        target = Math.floor(rng.next() * nodeCount);
      }

      if (target !== i) {
        const linkId = `${Math.min(i, target)}-${Math.max(i, target)}`;
        if (!linkSet.has(linkId)) {
          linkSet.add(linkId);
          links.push({
            source: nodes[i].id,
            target: nodes[target].id,
          });
          linksCreated++;
        }
      }
    }
  }

  return { nodes, links };
}

/* =======================
   COMPONENT
======================= */
export default function NeuralGraph({ roomId }: NeuralGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const simulationRef = useRef<d3.Simulation<NeuralNode, any> | null>(null);
  const [stats, setStats] = useState({ nodes: 0, links: 0, active: 0 });

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 700;

    // Generate brain structure (deterministic based on roomId)
    const { nodes, links } = generateBrain(roomId, 800, 3);
    
    // Update stats
    setStats({
      nodes: nodes.length,
      links: links.length,
      active: nodes.filter(n => n.active).length
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    /* =======================
       GRADIENTS
    ======================= */
    const defs = svg.append("defs");
    
    const activeGradient = defs.append("radialGradient")
      .attr("id", `activeGlow-${roomId || 'default'}`)
      .attr("cx", "50%")
      .attr("cy", "50%");
    
    activeGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#22c55e")
      .attr("stop-opacity", 1);
    
    activeGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#16a34a")
      .attr("stop-opacity", 0.8);

    const inactiveGradient = defs.append("radialGradient")
      .attr("id", `inactiveGlow-${roomId || 'default'}`)
      .attr("cx", "50%")
      .attr("cy", "50%");
    
    inactiveGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#8b5cf6")
      .attr("stop-opacity", 0.9);
    
    inactiveGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#6d28d9")
      .attr("stop-opacity", 0.7);

    const group = svg.append("g");

    /* =======================
       ZOOM + PAN
    ======================= */
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        group.attr("transform", event.transform);
      });
    
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity);

    /* =======================
       FORCE SIMULATION (OPTIMIZED)
    ======================= */
    const simulation = d3
      .forceSimulation<NeuralNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<NeuralNode, any>(links)
          .id((d) => d.id)
          .distance(40)
          .strength(0.3)
      )
      .force("charge", d3.forceManyBody().strength(-15))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(8))
      .alphaDecay(0.02)
      .velocityDecay(0.4);

    simulationRef.current = simulation;

    /* =======================
       LINKS (EFFICIENT RENDERING)
    ======================= */
    const link = group
      .append("g")
      .attr("class", "links-layer")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#64748b")
      .attr("stroke-opacity", 0.2)
      .attr("stroke-width", 0.8);

    /* =======================
       NODES (EFFICIENT RENDERING)
    ======================= */
    const node = group
      .append("g")
      .attr("class", "nodes-layer")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", (d) => (d.active ? 5 : 2.5))
      .attr("fill", (d) => 
        d.active 
          ? `url(#activeGlow-${roomId || 'default'})` 
          : `url(#inactiveGlow-${roomId || 'default'})`
      )
      .attr("opacity", (d) => (d.active ? 1 : 0.7))
      .style("cursor", "pointer")
      .on("mouseenter", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", (d.active ? 8 : 5))
          .attr("opacity", 1);
        
        // Highlight connected links
        link
          .transition()
          .duration(200)
          .attr("stroke-opacity", (l: any) => 
            (l.source.id === d.id || l.target.id === d.id) ? 0.6 : 0.1
          )
          .attr("stroke-width", (l: any) =>
            (l.source.id === d.id || l.target.id === d.id) ? 2 : 0.8
          )
          .attr("stroke", (l: any) =>
            (l.source.id === d.id || l.target.id === d.id) ? "#22c55e" : "#64748b"
          );
      })
      .on("mouseleave", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", (d.active ? 5 : 2.5))
          .attr("opacity", (d.active ? 1 : 0.7));
        
        link
          .transition()
          .duration(200)
          .attr("stroke-opacity", 0.2)
          .attr("stroke-width", 0.8)
          .attr("stroke", "#64748b");
      })
      .on("click", function(event, d) {
        event.stopPropagation();
        d.active = !d.active;
        
        // Update stats
        setStats(prev => ({
          ...prev,
          active: prev.active + (d.active ? 1 : -1)
        }));
        
        d3.select(this)
          .transition()
          .duration(300)
          .attr("r", d.active ? 5 : 2.5)
          .attr("fill", d.active 
            ? `url(#activeGlow-${roomId || 'default'})` 
            : `url(#inactiveGlow-${roomId || 'default'})`
          )
          .attr("opacity", d.active ? 1 : 0.7);
      })
      .call(
        d3.drag<SVGCircleElement, NeuralNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = d.x;
            d.fy = d.y;
          })
      );

    /* =======================
       EFFICIENT TICK (RAF-BASED)
    ======================= */
    let rafId: number;
    
    simulation.on("tick", () => {
      // Cancel previous frame
      if (rafId) cancelAnimationFrame(rafId);
      
      // Schedule next frame
      rafId = requestAnimationFrame(() => {
        link
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

        node
          .attr("cx", (d) => d.x!)
          .attr("cy", (d) => d.y!);
      });
    });

    /* =======================
       NEURAL ACTIVITY ANIMATION
    ======================= */
    function pulseActiveNeurons() {
      node
        .filter((d: any) => d.active)
        .transition()
        .duration(800)
        .attr("r", 7)
        .transition()
        .duration(800)
        .attr("r", 5);
    }

    const pulseInterval = setInterval(pulseActiveNeurons, 1600);

    // Cleanup function
    return () => {
      simulation.stop();
      clearInterval(pulseInterval);
      if (rafId) cancelAnimationFrame(rafId);
      simulationRef.current = null;
    };
  }, [roomId]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
    >
      {/* Info Panel */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-sm px-4 py-3 rounded-lg border border-slate-700 shadow-lg">
        <p className="text-sm text-slate-300 font-medium flex items-center gap-2">
          🧠 Neural Network
          {roomId && (
            <span className="text-xs text-slate-500 font-mono">
              #{roomId.slice(0, 8)}
            </span>
          )}
        </p>
        <div className="flex gap-4 mt-2 text-xs text-slate-400">
          <span>Neurons: <span className="text-slate-300 font-medium">{stats.nodes}</span></span>
          <span>Synapses: <span className="text-slate-300 font-medium">{stats.links}</span></span>
          <span>Active: <span className="text-green-400 font-medium">{stats.active}</span></span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Drag • Zoom • Click to toggle
        </p>
      </div>

      {/* Canvas */}
      <svg
        ref={svgRef}
        width="100%"
        height={700}
        className="cursor-grab active:cursor-grabbing"
      />
    </div>
  );
}