"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toursApi } from "@/lib/api/tours";
import { getDeviceId } from "@/lib/device";
import { useAuthStore } from "@/stores/auth-store";
import { useTourStore } from "@/stores/tour-store";
import type { TourDef, TourProgressEntry } from "@/lib/tours/types";

type ProgressData = { deviceId: string; tours: TourProgressEntry[] };

const QUERY_ROOT = "tour-progress";

/** Tours this user finished or skipped on this device. */
export function useTourProgress() {
  const userId = useAuthStore((s) => s.user?.id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const queryKey = [QUERY_ROOT, userId];

  const query = useQuery({
    queryKey,
    queryFn: () => toursApi.list(getDeviceId()),
    enabled: isAuthenticated && Boolean(userId),
    staleTime: Infinity,
    retry: 1,
  });

  const save = useMutation({
    mutationFn: ({ tour, status }: { tour: TourDef; status: TourProgressEntry["status"] }) =>
      toursApi.save(getDeviceId(), tour.id, status, tour.version),
    // Optimistic: the tour must not start again while the request is in flight
    onMutate: ({ tour, status }) => {
      // Only on top of loaded progress: writing into a failed query would mark it loaded
      // and let tours start by themselves although nothing can be saved
      queryClient.setQueryData<ProgressData>(queryKey, (old) => {
        if (!old) return old;
        const entry: TourProgressEntry = {
          tourId: tour.id,
          version: tour.version,
          status,
          updatedAt: new Date().toISOString(),
        };
        return { ...old, tours: [...old.tours.filter((t) => t.tourId !== tour.id), entry] };
      });
    },
  });

  const reset = useMutation({
    mutationFn: (tourId?: string) => toursApi.reset(getDeviceId(), tourId),
    onSuccess: (_, tourId) => {
      // Let replayed tours start by themselves again without a reload
      useTourStore.getState().clearAutoTried();
      queryClient.setQueryData<ProgressData>(queryKey, (old) =>
        old ? { ...old, tours: tourId ? old.tours.filter((t) => t.tourId !== tourId) : [] } : old,
      );
    },
  });

  const entries = query.data?.tours ?? [];
  const entryFor = (tour: TourDef) =>
    entries.find((e) => e.tourId === tour.id && e.version >= tour.version) ?? null;

  return {
    /** Loaded without error: only then may tours start by themselves */
    ready: query.isSuccess,
    isLoading: query.isLoading,
    isError: query.isError,
    /** Finished or skipped at the current version */
    isDone: (tour: TourDef) => entryFor(tour) !== null,
    statusOf: (tour: TourDef) => entryFor(tour)?.status ?? null,
    markDone: (tour: TourDef, status: TourProgressEntry["status"]) => save.mutate({ tour, status }),
    reset: (tourId?: string) => reset.mutateAsync(tourId),
    isResetting: reset.isPending,
  };
}
