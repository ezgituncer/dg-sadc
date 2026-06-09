export type WorkStatus = 'ongoing' | 'completed' | 'blocked';
export type Complexity = 'low' | 'medium' | 'high';

export interface WorkloadEntry {
  id: number;
  accountId: string;
  workDate: string;
  activityTypeId: number;
  categoryId: number;
  projectId: number | null;
  taskTypeId: number | null;
  taskDescription: string;
  status: WorkStatus;
  complexity: Complexity;
  quantity: number | null;
  hoursSpent: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkloadEntryListResponse {
  items: WorkloadEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WorkloadEntryCreate {
  workDate: string;
  activityTypeId: number;
  categoryId: number;
  projectId: number | null;
  taskTypeId: number | null;
  taskDescription: string;
  status: WorkStatus;
  complexity: Complexity;
  quantity: number | null;
  hoursSpent: string;
}

export type WorkloadEntryUpdate = Partial<WorkloadEntryCreate>;

export interface TrendPoint {
  date: string;
  hours: string;
}

export interface ProjectAggregate {
  projectId: number | null;
  name: string;
  hours: string;
}

export interface ActivityAggregate {
  activityTypeId: number;
  name: string;
  hours: string;
}

export interface WorkloadAggregates {
  byDate: TrendPoint[];
  byProject: ProjectAggregate[];
  byActivity: ActivityAggregate[];
  totalHours: string;
  totalEntries: number;
}

export interface WorkloadEntryFilters {
  accountId?: string[];
  dateFrom?: string;
  dateTo?: string;
  projectId?: number;
  activityTypeId?: number;
  taskTypeId?: number;
  status?: WorkStatus;
  complexity?: Complexity;
  search?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}
