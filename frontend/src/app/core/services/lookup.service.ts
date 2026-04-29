import { computed, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, forkJoin } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ActivityType,
  CategoryInfo,
  ProjectInfo,
  TaskType,
} from '../models/lookup';

@Injectable({ providedIn: 'root' })
export class LookupService {
  private readonly base = environment.apiUrl;
  private readonly _activityTypes = signal<ActivityType[]>([]);
  private readonly _projectCategories = signal<CategoryInfo[]>([]);
  private readonly _nonProjCategories = signal<CategoryInfo[]>([]);
  private readonly _selfImpCategories = signal<CategoryInfo[]>([]);
  private readonly _projects = signal<ProjectInfo[]>([]);
  private readonly _taskTypes = signal<TaskType[]>([]);
  private readonly _ready = signal(false);

  readonly activityTypes = this._activityTypes.asReadonly();
  readonly projectCategories = this._projectCategories.asReadonly();
  readonly nonProjCategories = this._nonProjCategories.asReadonly();
  readonly selfImpCategories = this._selfImpCategories.asReadonly();
  readonly projects = this._projects.asReadonly();
  readonly taskTypes = this._taskTypes.asReadonly();
  readonly ready = this._ready.asReadonly();

  readonly activeActivityTypes = computed(() =>
    this._activityTypes().filter((a) => a.isActive),
  );
  readonly activeProjects = computed(() => this._projects().filter((p) => p.isActive));
  readonly activeTaskTypes = computed(() => this._taskTypes().filter((t) => t.isActive));

  constructor(private readonly http: HttpClient) {}

  async loadAll(): Promise<void> {
    const all = await firstValueFrom(
      forkJoin({
        activityTypes: this.http.get<ActivityType[]>(`${this.base}/activity-types`),
        projectCategories: this.http.get<CategoryInfo[]>(`${this.base}/project-categories`),
        nonProjCategories: this.http.get<CategoryInfo[]>(`${this.base}/non-project-categories`),
        selfImpCategories: this.http.get<CategoryInfo[]>(`${this.base}/self-imp-categories`),
        projects: this.http.get<ProjectInfo[]>(`${this.base}/projects`),
        taskTypes: this.http.get<TaskType[]>(`${this.base}/task-types`),
      }),
    );
    this._activityTypes.set(all.activityTypes);
    this._projectCategories.set(all.projectCategories);
    this._nonProjCategories.set(all.nonProjCategories);
    this._selfImpCategories.set(all.selfImpCategories);
    this._projects.set(all.projects);
    this._taskTypes.set(all.taskTypes);
    this._ready.set(true);
  }

  /** Stable activity IDs: 1=PROJECT, 2=NON_PROJECT, 3=SELF_IMP */
  getCategoriesForActivity(activityTypeId: number | null): CategoryInfo[] {
    if (activityTypeId === 1) return this._projectCategories().filter((c) => c.isActive);
    if (activityTypeId === 2) return this._nonProjCategories().filter((c) => c.isActive);
    if (activityTypeId === 3) return this._selfImpCategories().filter((c) => c.isActive);
    return [];
  }

  findCategory(activityTypeId: number, categoryId: number): CategoryInfo | undefined {
    const list = this.getCategoriesForActivity(activityTypeId);
    return list.find((c) => c.id === categoryId);
  }

  findProject(projectId: number | null | undefined): ProjectInfo | undefined {
    if (projectId == null) return undefined;
    return this._projects().find((p) => p.id === projectId);
  }

  findActivityType(id: number): ActivityType | undefined {
    return this._activityTypes().find((a) => a.id === id);
  }

  findTaskType(id: number): TaskType | undefined {
    return this._taskTypes().find((t) => t.id === id);
  }
}
