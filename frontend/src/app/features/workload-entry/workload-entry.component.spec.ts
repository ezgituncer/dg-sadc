import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { WorkloadEntryComponent } from './workload-entry.component';
import { AuthService } from '../../core/services/auth.service';
import { LookupService } from '../../core/services/lookup.service';
import { WorkloadService } from '../../core/services/workload.service';
import { CurrentUser } from '../../core/models/user';

describe('WorkloadEntryComponent', () => {
  let fixture: ComponentFixture<WorkloadEntryComponent>;
  let component: WorkloadEntryComponent;

  const mockUser: CurrentUser = {
    id: 12,
    accountId: 'EMP001',
    email: 'developer1@company.com',
    name: 'Hakan Yıldız',
    position: 'Developer',
    isActive: true,
    roleId: 6,
    roleCode: 'WORKER',
    teamId: 1,
    managerAccountId: 'MGR001',
  };

  const authStub = {
    currentUser: signal(mockUser),
    roleCode: signal<'WORKER'>('WORKER'),
    isWorker: () => true,
    getToken: () => 'token',
    isLoggedIn: signal(true),
  };

  const lookupStub = {
    activityTypes: signal([
      { id: 1, code: 'PROJECT', name: 'Project Activity', description: null, isActive: true, createdAt: '', updatedAt: '' },
      { id: 2, code: 'NON_PROJECT', name: 'Non-Project', description: null, isActive: true, createdAt: '', updatedAt: '' },
    ]),
    activeActivityTypes: signal([
      { id: 1, code: 'PROJECT', name: 'Project Activity', description: null, isActive: true, createdAt: '', updatedAt: '' },
      { id: 2, code: 'NON_PROJECT', name: 'Non-Project', description: null, isActive: true, createdAt: '', updatedAt: '' },
    ]),
    projects: signal([]),
    activeProjects: signal([{ id: 1, code: 'ATLAS', name: 'Atlas', description: null, isActive: true, createdAt: '', updatedAt: '' }]),
    taskTypes: signal([]),
    activeTaskTypes: signal([{ id: 1, code: 'DEV', name: 'Development', isActive: true, createdAt: '', updatedAt: '' }]),
    projectCategories: signal([{ id: 1, code: 'FRONTEND', name: 'Frontend', color: '#000', isActive: true, createdAt: '', updatedAt: '' }]),
    nonProjCategories: signal([{ id: 1, code: 'MEETING', name: 'Toplantı', color: '#000', isActive: true, createdAt: '', updatedAt: '' }]),
    selfImpCategories: signal([]),
    ready: signal(true),
    getCategoriesForActivity: (id: number | null) => {
      if (id === 1) return lookupStub.projectCategories();
      if (id === 2) return lookupStub.nonProjCategories();
      return [];
    },
    findCategory: () => undefined,
    findProject: () => undefined,
    findActivityType: () => undefined,
    findTaskType: () => undefined,
    loadAll: async () => {},
  };

  const workloadStub = {
    list: () => ({ subscribe: ({ next }: any) => next({ items: [], total: 0, page: 1, pageSize: 50 }) }),
    create: () => ({ subscribe: ({ next }: any) => next({ id: 1 }) }),
    update: () => ({ subscribe: ({ next }: any) => next({ id: 1 }) }),
    delete: () => ({ subscribe: ({ next }: any) => next() }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkloadEntryComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AuthService, useValue: authStub },
        { provide: LookupService, useValue: lookupStub },
        { provide: WorkloadService, useValue: workloadStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkloadEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('resets category and project when activity type changes', () => {
    // Pretend the user has filled the form for activity=Project
    component.patch('categoryId', 1);
    component.patch('projectId', 1);
    expect(component.form().categoryId).toBe(1);
    expect(component.form().projectId).toBe(1);

    // Switch to non-project
    component.onActivityTypeChange(2);

    expect(component.form().activityTypeId).toBe(2);
    expect(component.form().categoryId).toBeNull();
    expect(component.form().projectId).toBeNull();
  });

  it('hides the project field when activity is non-project', () => {
    component.onActivityTypeChange(2);
    expect(component.isProjectActivity()).toBeFalse();

    component.onActivityTypeChange(1);
    expect(component.isProjectActivity()).toBeTrue();
  });

  it('rejects invalid form when project is missing for activity=Project', () => {
    component.onActivityTypeChange(1);
    component.patch('categoryId', 1);
    component.patch('taskTypeId', 1);
    component.patch('taskDescription', 'x');
    component.patch('hoursSpent', '2');
    expect(component.isFormValid()).toBeFalse(); // project missing
    component.patch('projectId', 1);
    expect(component.isFormValid()).toBeTrue();
  });
});
