// All shared interfaces. No runtime code — types only.

export interface Progress {
  project: string;
  last_updated: string;
  last_agent: string;
  current_milestone: {
    id: string; name: string; branch: string; worktree: string;
    status: string; tasks_total: number; tasks_done: number;
    tasks_in_progress: number; tasks_blocked: number; tasks_remaining: number;
  } | null;
  current_task: {
    id: string; story: string; description: string;
    status: string; started_at: string; files_touched: string[]; notes: string;
  } | null;
  active_milestones: ActiveMilestone[];
  completed_milestones: Array<{ id: string; name: string; completed_at: string; tag?: string }>;
  blockers: Array<{ task_id: string; description: string; error?: string; added_at: string }>;
  learnings: Array<Record<string, unknown>>;
  dependency_graph: Record<string, { depends_on: string[]; blocks: string[] }>;
  synced_plans: string[];
  agents: AgentEntry[];
  finish_jobs: FinishJobEntry[];
  [key: string]: unknown;
}

export interface ActiveMilestone {
  id: string;
  title: string;
  status?: string;
  branch?: string;
  worktree?: string;
  depends_on?: string[];
  started_at?: string;
  completed_at?: string | null;
  tasks_total?: number;
  tasks_done?: number;
  tasks_in_progress?: number;
  tasks_blocked?: number;
  tasks_remaining?: number;
  tasks?: Array<Record<string, unknown>>;
  [k: string]: unknown;
}

export interface AgentEntry {
  id: string;
  milestone: string | null;
  worktree: string;
  branch: string;
  started_at: string;
  heartbeat: string;
}

export interface FinishJobEntry {
  milestone: string;
  status: 'queued' | 'running' | 'failed' | 'succeeded';
  requested_at: string;
  started_at?: string;
  finished_at?: string;
  requested_by?: string;
  error?: string;
  last_update: string;
}

export interface WorktreeInfo {
  isWorktree: boolean;
  cwd: string;
  mainRoot: string;
  currentBranch: string;
  milestoneId: string | null;
}
