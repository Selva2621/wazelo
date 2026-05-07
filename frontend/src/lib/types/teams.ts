export interface TeamMember {
  id: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  createdAt: string;
}

export interface Team {
  id: string;
  orgId: string;
  name: string;
  managerId: string;
  manager: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamRequest {
  name: string;
  managerId: string;
}

export interface UpdateTeamRequest {
  name?: string;
  managerId?: string;
}

export interface AddTeamMemberRequest {
  userId: string;
}
