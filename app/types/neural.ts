export interface NeuralNode {
  id: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface NeuralLink {
  source: string | NeuralNode;
  target: string | NeuralNode;
}
