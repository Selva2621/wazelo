"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSurvey, useSubmitSurvey } from "@/hooks/use-csat";

function StarIcon({ filled, hovered }: { filled: boolean; hovered: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-10 h-10 transition-colors duration-100"
      fill={filled || hovered ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
      />
    </svg>
  );
}

const LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
const COLORS = ["", "text-red-500", "text-orange-400", "text-yellow-400", "text-lime-500", "text-green-500"];

export default function CsatSurveyPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;

  const { data, isLoading, isError } = useSurvey(conversationId);
  const submitMutation = useSubmitSurvey(conversationId);

  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;
    await submitMutation.mutateAsync({ rating: selected, comment: comment.trim() || undefined });
    setSubmitted(true);
  };

  // Loading
  if (isLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading survey…</p>
        </div>
      </Shell>
    );
  }

  // Error or not found
  if (isError || !data || "error" in data) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <p className="font-medium text-gray-700">Survey Not Found</p>
          <p className="text-sm text-gray-500">This survey link is invalid or has expired.</p>
        </div>
      </Shell>
    );
  }

  // Already submitted (from API) or just submitted now
  if (data.alreadySubmitted || submitted) {
    const rating = submitted ? selected : (data.rating ?? 0);
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-800">Thank you!</p>
            <p className="text-sm text-gray-500 mt-1">Your feedback has been recorded.</p>
          </div>
          {rating > 0 && (
            <div className={`flex items-center gap-1 text-2xl ${COLORS[rating]}`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < rating ? COLORS[rating] : "text-gray-200"}>
                  ★
                </span>
              ))}
              <span className="text-sm font-medium ml-2 text-gray-600">{LABELS[rating]}</span>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  // Rating form
  const activeRating = hovered || selected;

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <p className="text-base text-gray-600">
            How satisfied were you with our support?
          </p>
        </div>

        {/* Stars */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="flex gap-1"
            onMouseLeave={() => setHovered(0)}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setSelected(star)}
                onMouseEnter={() => setHovered(star)}
                className={`transition-colors ${
                  star <= activeRating ? COLORS[activeRating] : "text-gray-300"
                }`}
                aria-label={`${star} star`}
              >
                <StarIcon filled={star <= selected} hovered={star <= hovered} />
              </button>
            ))}
          </div>
          <p className={`text-sm font-medium h-5 ${COLORS[activeRating]}`}>
            {activeRating > 0 ? LABELS[activeRating] : ""}
          </p>
        </div>

        {/* Comment */}
        {selected > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Additional comments <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Tell us more about your experience…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!selected || submitMutation.isPending}
          className="w-full rounded-lg bg-blue-600 text-white text-sm font-medium py-2.5 px-4 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitMutation.isPending ? "Submitting…" : "Submit Feedback"}
        </button>

        {submitMutation.isError && (
          <p className="text-sm text-red-500 text-center">Something went wrong. Please try again.</p>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-1 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-2">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Rate Your Experience</h1>
          <p className="text-xs text-gray-400">Your feedback helps us improve</p>
        </div>
        {children}
      </div>
    </div>
  );
}
