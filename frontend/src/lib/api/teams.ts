import apiClient from "./client";
import type {
  Team,
  CreateTeamRequest,
  UpdateTeamRequest,
  AddTeamMemberRequest,
  TeamMember,
} from "@/lib/types/teams";

export const teamsApi = {
  list: () =>
    apiClient.get<Team[]>("/teams").then((r) => r.data),

  create: (data: CreateTeamRequest) =>
    apiClient.post<Team>("/teams", data).then((r) => r.data),

  update: (id: string, data: UpdateTeamRequest) =>
    apiClient.patch<Team>(`/teams/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/teams/${id}`).then((r) => r.data),

  addMember: (teamId: string, data: AddTeamMemberRequest) =>
    apiClient
      .post<TeamMember>(`/teams/${teamId}/members`, data)
      .then((r) => r.data),

  removeMember: (teamId: string, userId: string) =>
    apiClient
      .delete(`/teams/${teamId}/members/${userId}`)
      .then((r) => r.data),
};
