"use client";

import NeuralGraph from "./components/NeuralGraph";
import ThoughtCard from "./components/ThoughtCard";
import BrainRoomCard from "./components/BrainRoomCard";
import AIInsights from "./components/AIInsights";
import CreateThoughtModal from "./components/CreateThoughtModal";

export default function NeuralNexus() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white p-10">
      
      {/* HERO */}
      <section className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4">Neural Nexus</h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Connect with collective consciousness through mind-link technology.
          Ideas don’t compete here — they connect.
        </p>
      </section>

      {/* NEURAL GRAPH */}
      <section className="mb-20">
        <h2 className="text-3xl font-semibold mb-6">Live Neural Network</h2>
        <NeuralGraph />
      </section>

      {/* TRENDING THOUGHTS */}
      <section className="mb-20">
        <h2 className="text-3xl font-semibold mb-6">Trending Thought Nodes</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <ThoughtCard />
          <ThoughtCard />
          <ThoughtCard />
        </div>
      </section>

      {/* BRAIN ROOMS */}
      <section className="mb-20">
        <h2 className="text-3xl font-semibold mb-6">Collective Brain Rooms</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <BrainRoomCard />
          <BrainRoomCard />
        </div>
      </section>

      {/* AI INSIGHTS */}
      <section className="mb-20">
        <AIInsights />
      </section>

      <CreateThoughtModal />
    </div>
  );
}
