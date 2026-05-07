"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teamsApi } from "@/lib/api/teams";
import type {
  CreateTeamRequest,
  UpdateTeamRequest,
  AddTeamMemberRequest,
} from "@/lib/types/teams";

export const teamKeys = {
  all: ["teams"] as const,
  list: () => ["teams", "list"] as const,
};

export function useTeams() {
  return useQuery({
    queryKey: teamKeys.list(),
    queryFn: () => teamsApi.list(),
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTeamRequest) => teamsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTeamRequest }) =>
      teamsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      teamId,
      data,
    }: {
      teamId: string;
      data: AddTeamMemberRequest;
    }) => teamsApi.addMember(teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      teamId,
      userId,
    }: {
      teamId: string;
      userId: string;
    }) => teamsApi.removeMember(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}
