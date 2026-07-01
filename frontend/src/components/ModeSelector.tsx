import { Globe, FlaskConical } from "lucide-react";

interface ModeSelectorProps {
  mode: "world" | "lab";
  onChange: (mode: "world" | "lab") => void;
}

export default function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="flex p-1 bg-gray-100/80 rounded-xl border border-gray-200 w-full max-w-sm mx-auto">
      {/* World Kitchen Mode Tab */}
      <button
        onClick={() => onChange("world")}
        className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 font-display text-xs font-bold transition-all cursor-pointer ${
          mode === "world" 
            ? "bg-white text-brand-600 shadow-xs border border-gray-200" 
            : "text-gray-500 hover:text-gray-800 bg-transparent border border-transparent"
        }`}
      >
        <Globe className={`h-4 w-4 transition-transform ${mode === "world" ? "text-brand-500 scale-110" : "text-gray-400"}`} />
        <span className="whitespace-nowrap">World Kitchen</span>
      </button>

      {/* AI Kitchen Lab Mode Tab */}
      <button
        onClick={() => onChange("lab")}
        className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 font-display text-xs font-bold transition-all cursor-pointer ${
          mode === "lab" 
            ? "bg-white text-purple-600 shadow-xs border border-gray-200" 
            : "text-gray-500 hover:text-gray-800 bg-transparent border border-transparent"
        }`}
      >
        <FlaskConical className={`h-4 w-4 transition-transform ${mode === "lab" ? "text-purple-500 scale-110" : "text-gray-400"}`} />
        <span className="whitespace-nowrap">AI Kitchen Lab</span>
      </button>
    </div>
  );
}
