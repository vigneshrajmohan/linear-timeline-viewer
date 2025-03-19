import { LinearClient, Issue, User, Team, WorkflowState } from "@linear/sdk";

// Types for our Linear data
export interface LinearIssue {
  id: string;
  title: string;
  identifier: string;
  description?: string;
  priority?: number;
  state: {
    id: string;
    name: string;
    color?: string;
  };
  assignee?: {
    id: string;
    name: string;
    displayName?: string;
    avatarUrl?: string;
  };
  startedAt?: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface LinearUser {
  id: string;
  name: string;
  displayName: string;
  avatarUrl?: string;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
  color?: string;
}

// Type for the Linear API response
type LinearFetch<T> = T & {
  id: string;
  name: string;
  color?: string;
  displayName?: string;
  avatarUrl?: string;
};

// Initialize Linear client with access token
const getLinearClient = (accessToken: string) => {
  try {
    console.log("Creating Linear client with token:", accessToken.substring(0, 10) + "...");
    return new LinearClient({ accessToken });
  } catch (error) {
    console.error("Error creating Linear client:", error);
    throw error;
  }
};

// Fetch all issues with their details
export const fetchIssues = async (accessToken: string): Promise<LinearIssue[]> => {
  try {
    const linearClient = getLinearClient(accessToken);
    
    console.log("Fetching issues from Linear API...");
    const { nodes } = await linearClient.issues({
      filter: {
        dueDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() }, // Issues due in the last 30 days or upcoming
      },
    });
    
    console.log(`Received ${nodes.length} issues from Linear API`);
    
    return nodes.map((issue: Issue) => {
      // Use type assertions with unknown as intermediate step to avoid TypeScript errors
      const state = issue.state ? (issue.state as unknown as LinearFetch<WorkflowState>) : null;
      const assignee = issue.assignee ? (issue.assignee as unknown as LinearFetch<User>) : null;
      
      return {
        id: issue.id!,
        title: issue.title,
        identifier: issue.identifier,
        description: issue.description || undefined,
        priority: issue.priority,
        state: {
          id: state?.id || 'unknown',
          name: state?.name || 'Unknown',
          color: state?.color || undefined,
        },
        assignee: assignee ? {
          id: assignee.id,
          name: assignee.name,
          displayName: assignee.displayName || assignee.name,
          avatarUrl: assignee.avatarUrl || undefined,
        } : undefined,
        startedAt: issue.startedAt ? new Date(issue.startedAt).toISOString() : undefined,
        dueDate: issue.dueDate,
        completedAt: issue.completedAt ? new Date(issue.completedAt).toISOString() : undefined,
        createdAt: new Date(issue.createdAt).toISOString(),
        updatedAt: new Date(issue.updatedAt).toISOString(),
        url: issue.url,
      };
    });
  } catch (error) {
    console.error("Error in fetchIssues:", error);
    throw error;
  }
};

// Fetch all users
export const fetchUsers = async (accessToken: string): Promise<LinearUser[]> => {
  try {
    const linearClient = getLinearClient(accessToken);
    
    console.log("Fetching users from Linear API...");
    const { nodes } = await linearClient.users();
    
    console.log(`Received ${nodes.length} users from Linear API`);
    
    return nodes.map((user) => {
      const typedUser = user as LinearFetch<User>;
      return {
        id: typedUser.id,
        name: typedUser.name,
        displayName: typedUser.displayName || typedUser.name,
        avatarUrl: typedUser.avatarUrl || undefined,
      };
    });
  } catch (error) {
    console.error("Error in fetchUsers:", error);
    throw error;
  }
};

// Fetch all teams
export const fetchTeams = async (accessToken: string): Promise<LinearTeam[]> => {
  try {
    const linearClient = getLinearClient(accessToken);
    
    console.log("Fetching teams from Linear API...");
    const { nodes } = await linearClient.teams();
    
    console.log(`Received ${nodes.length} teams from Linear API`);
    
    return nodes.map((team) => {
      const typedTeam = team as any;
      return {
        id: typedTeam.id,
        name: typedTeam.name,
        key: typedTeam.key,
        color: typedTeam.color || undefined,
      };
    });
  } catch (error) {
    console.error("Error in fetchTeams:", error);
    throw error;
  }
};
