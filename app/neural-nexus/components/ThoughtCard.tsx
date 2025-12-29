export default function ThoughtCard() {
  return (
    <div className="p-6 rounded-2xl bg-slate-800/60 border border-white/10 hover:border-cyan-400 transition">
      <h3 className="text-xl font-semibold mb-2">
        Trust vs Surveillance in AI
      </h3>
      <p className="text-gray-400 text-sm mb-4">
        Collective opinion suggests safety is rooted in trust, not control.
      </p>

      <div className="flex justify-between text-xs text-gray-500">
        <span>🧠 Reflective</span>
        <span>🔥 Impact 82</span>
      </div>
    </div>
  );
}
