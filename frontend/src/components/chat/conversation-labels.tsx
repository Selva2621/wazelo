"use client";

import { useState } from "react";
import { Tag, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Label {
  id: string;
  name: string;
  color: string | null;
}

interface ConversationLabelsProps {
  labels: Label[];
  onAdd: (name: string, color?: string) => void;
  onRemove: (labelId: string) => void;
}

const LABEL_COLORS = [
  "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899",
];

export function ConversationLabels({
  labels,
  onAdd,
  onRemove,
}: ConversationLabelsProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedColor, setSelectedColor] = useState(LABEL_COLORS[0]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd(newName.trim(), selectedColor);
    setNewName("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-on-surface-variant/50" />
          <span className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wider">
            Labels
          </span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-on-surface-variant/50 hover:text-primary transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Existing labels */}
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {labels.map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-container"
              style={{
                borderLeft: label.color ? `3px solid ${label.color}` : undefined,
              }}
            >
              {label.name}
              <button
                onClick={() => onRemove(label.id)}
                className="text-on-surface-variant/40 hover:text-error ml-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add label form */}
      {showAdd && (
        <div className="space-y-2 p-2 rounded-lg bg-surface-container/30">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Label name"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <div className="flex items-center gap-1.5">
            {LABEL_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`h-5 w-5 rounded-full transition-transform ${
                  selectedColor === color ? "ring-2 ring-offset-1 ring-primary scale-110" : ""
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
