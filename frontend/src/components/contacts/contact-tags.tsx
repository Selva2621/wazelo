"use client";

import { useState, useRef } from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAddTag, useRemoveTag, useOrgTags } from "@/hooks/use-contacts";
import type { ContactTag } from "@/lib/types/contacts";

interface ContactTagsProps {
  contactId: string;
  tags: ContactTag[];
}

export function ContactTags({ contactId, tags }: ContactTagsProps) {
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addTag = useAddTag();
  const removeTag = useRemoveTag();
  const { data: orgTags } = useOrgTags();

  const existingTagNames = new Set(tags.map((t) => t.tag.name));
  const suggestions = (orgTags ?? []).filter(
    (t) =>
      !existingTagNames.has(t.name) &&
      t.name.includes(inputValue.toLowerCase()),
  );

  function handleAdd(name: string) {
    if (!name.trim()) return;
    addTag.mutate(
      { contactId, name: name.trim() },
      {
        onSuccess: () => {
          setInputValue("");
          setShowInput(false);
          setShowSuggestions(false);
        },
      },
    );
  }

  function handleRemove(tagId: string) {
    removeTag.mutate({ contactId, tagId });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd(inputValue);
    }
    if (e.key === "Escape") {
      setShowInput(false);
      setInputValue("");
      setShowSuggestions(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((ct) => (
          <span
            key={ct.id}
            className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-medium text-on-surface-variant"
          >
            {ct.tag.color && (
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: ct.tag.color }}
              />
            )}
            {ct.tag.name}
            <button
              onClick={() => handleRemove(ct.tagId)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-surface-container-high transition-colors"
              disabled={removeTag.isPending}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}

        {showInput ? (
          <div className="relative">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Tag name..."
              autoFocus
              className="h-6 w-28 rounded-full bg-surface-container-low px-2.5 text-[11px] text-on-surface outline-none focus:ring-1 focus:ring-primary/40"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-7 left-0 z-10 w-40 rounded-lg bg-surface-container-lowest border border-outline-variant/15 shadow-lg py-1">
                {suggestions.slice(0, 5).map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleAdd(tag.name)}
                    className="w-full px-3 py-1.5 text-left text-[12px] text-on-surface hover:bg-surface-container transition-colors"
                  >
                    {tag.color && (
                      <span
                        className="inline-block h-2 w-2 rounded-full mr-1.5"
                        style={{ backgroundColor: tag.color }}
                      />
                    )}
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              setShowInput(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="inline-flex items-center gap-0.5 rounded-full bg-surface-container-low px-2 py-0.5 text-[11px] text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        )}
      </div>
    </div>
  );
}
