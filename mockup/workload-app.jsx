import React, { useState, useMemo, createContext, useContext, Fragment } from 'react';
import { Lock, Mail, AlertCircle, Loader2, LogOut, LayoutDashboard, ClipboardList, Users, Settings, FolderOpen, Search, Plus, X, Save, Trash2, KeyRound, ChevronDown, Check, UserPlus, Filter, Power, Calendar, Clock, FileText, Hash, Activity, Tag, Layers, Edit2, Lock as LockIcon, TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

// ==================== DESIGN TOKENS ====================
const C = {
  bg: '#0A1628',
  surface: '#0F1F3A',
  surfaceHover: '#142847',
  surfaceDeep: '#081020',
  border: 'rgba(148, 163, 184, 0.12)',
  borderHover: 'rgba(45, 212, 191, 0.4)',
  borderFocus: '#2DD4BF',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  teal: '#2DD4BF',
  blue: '#3B82F6',
  purple: '#A78BFA',
  amber: '#F59E0B',
  pink: '#EC4899',
  green: '#10B981',
  red: '#EF4444',
};

// ==================== MOCK DATA ====================
const MOCK_ROLES = [
  { id: 1, code: 'ADMIN', name: 'Admin', description: 'Tam yetki' },
  { id: 2, code: 'HR', name: 'HR', description: 'İnsan kaynakları' },
  { id: 3, code: 'MANAGER', name: 'Manager', description: 'Yönetici' },
  { id: 4, code: 'TECH_LEAD', name: 'Technical Lead', description: 'Teknik lider' },
  { id: 5, code: 'QA_SPECIALIST', name: 'QA Specialist', description: 'Kalite uzmanı' },
  { id: 6, code: 'WORKER', name: 'Worker', description: 'Çalışan' },
];

const MOCK_TEAMS = [
  { id: 1, name: 'Engineering', description: 'Yazılım geliştirme', is_active: true },
  { id: 2, name: 'Product', description: 'Ürün yönetimi', is_active: true },
  { id: 3, name: 'Design', description: 'UI/UX tasarım', is_active: true },
  { id: 4, name: 'QA', description: 'Test ve kalite', is_active: true },
  { id: 5, name: 'DevOps', description: 'Altyapı ve deployment', is_active: true },
  { id: 6, name: 'Marketing', description: 'Pazarlama', is_active: true },
];

// 22 mock users — her rolden ve takımdan örnekler
const MOCK_USERS = [
  // Admin
  { id: 1, account_id: 'ADM001', email: 'admin@company.com', name: 'Ayşe Yılmaz', password: 'admin123', is_active: true, position: 'System Administrator', role_id: 1, team_id: 5, manager_account_id: null, created_at: '2024-01-15' },
  // HR
  { id: 2, account_id: 'HR001', email: 'hr.manager@company.com', name: 'Mehmet Kaya', password: 'hr123', is_active: true, position: 'HR Manager', role_id: 2, team_id: 6, manager_account_id: 'ADM001', created_at: '2024-02-01' },
  { id: 3, account_id: 'HR002', email: 'hr.specialist@company.com', name: 'Zeynep Demir', password: 'hr123', is_active: true, position: 'HR Specialist', role_id: 2, team_id: 6, manager_account_id: 'HR001', created_at: '2024-03-10' },
  // HEM (Head of Engineering) — between Director and Engineering managers
  { id: 23, account_id: 'HEM001', email: 'head.engineering@company.com', name: 'Mert Tunç', password: 'hem123', is_active: true, position: 'Head of Engineering', role_id: 3, team_id: 1, manager_account_id: 'ADM001', created_at: '2024-01-18' },
  // Managers
  { id: 4, account_id: 'MGR001', email: 'eng.manager@company.com', name: 'Ali Çelik', password: 'mgr123', is_active: true, position: 'Engineering Manager', role_id: 3, team_id: 1, manager_account_id: 'HEM001', created_at: '2024-01-20' },
  { id: 5, account_id: 'MGR002', email: 'product.manager@company.com', name: 'Selin Aydın', password: 'mgr123', is_active: true, position: 'Product Manager', role_id: 3, team_id: 2, manager_account_id: 'ADM001', created_at: '2024-02-15' },
  // Tech Leads
  { id: 7, account_id: 'TL001', email: 'frontend.lead@company.com', name: 'Cem Öztürk', password: 'tl123', is_active: true, position: 'Frontend Tech Lead', role_id: 4, team_id: 1, manager_account_id: 'MGR001', created_at: '2024-04-01' },
  { id: 8, account_id: 'TL002', email: 'backend.lead@company.com', name: 'Deniz Korkmaz', password: 'tl123', is_active: true, position: 'Backend Tech Lead', role_id: 4, team_id: 1, manager_account_id: 'MGR001', created_at: '2024-04-10' },
  { id: 9, account_id: 'TL003', email: 'devops.lead@company.com', name: 'Emre Polat', password: 'tl123', is_active: true, position: 'DevOps Tech Lead', role_id: 4, team_id: 5, manager_account_id: 'MGR001', created_at: '2024-05-01' },
  // QA Specialists
  { id: 10, account_id: 'QA001', email: 'qa.lead@company.com', name: 'Fatma Aslan', password: 'qa123', is_active: true, position: 'QA Lead', role_id: 5, team_id: 4, manager_account_id: 'ADM001', created_at: '2024-03-15' },
  { id: 11, account_id: 'QA002', email: 'qa.senior@company.com', name: 'Gökhan Erdem', password: 'qa123', is_active: true, position: 'Senior QA Engineer', role_id: 5, team_id: 4, manager_account_id: 'QA001', created_at: '2024-04-20' },
  // Workers — Engineering
  { id: 12, account_id: 'EMP001', email: 'developer1@company.com', name: 'Hakan Yıldız', password: 'pass123', is_active: true, position: 'Senior Frontend Developer', role_id: 6, team_id: 1, manager_account_id: 'MGR001', created_at: '2024-06-01' },
  { id: 13, account_id: 'EMP002', email: 'developer2@company.com', name: 'İrem Acar', password: 'pass123', is_active: true, position: 'Junior Frontend Developer', role_id: 6, team_id: 1, manager_account_id: 'MGR001', created_at: '2024-07-15' },
  { id: 14, account_id: 'EMP003', email: 'developer3@company.com', name: 'Kerem Bulut', password: 'pass123', is_active: true, position: 'Senior Backend Developer', role_id: 6, team_id: 1, manager_account_id: 'MGR001', created_at: '2024-06-10' },
  { id: 15, account_id: 'EMP004', email: 'developer4@company.com', name: 'Lale Kurt', password: 'pass123', is_active: true, position: 'Backend Developer', role_id: 6, team_id: 1, manager_account_id: 'MGR001', created_at: '2024-08-01' },
  // Workers — Product / Design
  { id: 16, account_id: 'EMP005', email: 'product1@company.com', name: 'Murat Tan', password: 'pass123', is_active: true, position: 'Product Owner', role_id: 6, team_id: 2, manager_account_id: 'MGR002', created_at: '2024-05-15' },
  // Workers — QA
  { id: 19, account_id: 'EMP008', email: 'qa1@company.com', name: 'Pınar Akın', password: 'pass123', is_active: true, position: 'QA Engineer', role_id: 6, team_id: 4, manager_account_id: 'QA001', created_at: '2024-07-01' },
  { id: 20, account_id: 'EMP009', email: 'qa2@company.com', name: 'Rıza Ergin', password: 'pass123', is_active: true, position: 'Junior QA Engineer', role_id: 6, team_id: 4, manager_account_id: 'QA001', created_at: '2024-10-01' },
  // Workers — DevOps
  { id: 21, account_id: 'EMP010', email: 'devops1@company.com', name: 'Sema Tekin', password: 'pass123', is_active: true, position: 'DevOps Engineer', role_id: 6, team_id: 5, manager_account_id: 'MGR001', created_at: '2024-06-20' },
];

// ==================== AUTH CONTEXT ====================
const AuthContext = createContext(null);

const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(MOCK_USERS);

  const login = (email, password) => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) return { success: false, error: 'Bu email ile kayıtlı kullanıcı bulunamadı' };
    if (!user.is_active) return { success: false, error: 'Hesabınız pasif durumda. Yöneticinize başvurun.' };
    if (user.password !== password) return { success: false, error: 'Email veya parola hatalı' };
    setCurrentUser(user);
    return { success: true };
  };

  const logout = () => setCurrentUser(null);

  const value = {
    currentUser,
    users,
    setUsers,
    roles: MOCK_ROLES,
    teams: MOCK_TEAMS,
    login,
    logout,
    getUserRole: (user) => MOCK_ROLES.find(r => r.id === user?.role_id),
    getUserTeam: (user) => MOCK_TEAMS.find(t => t.id === user?.team_id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ==================== ROUTER (mock) ====================
const RouterContext = createContext(null);
const useRouter = () => useContext(RouterContext);

const RouterProvider = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  return (
    <RouterContext.Provider value={{ currentRoute, navigate: setCurrentRoute }}>
      {children}
    </RouterContext.Provider>
  );
};

// ==================== ROLE → MENU MAPPING ====================
const MENU_BY_ROLE = {
  ADMIN: ['dashboard', 'workload-entry', 'workload-list', 'yearly-report', 'users', 'lookups'],
  HR: ['dashboard', 'workload-entry', 'workload-list', 'yearly-report', 'users', 'lookups'],
  MANAGER: ['dashboard', 'workload-entry', 'workload-list', 'yearly-report', 'users', 'lookups'],
  TECH_LEAD: ['dashboard', 'workload-entry', 'workload-list', 'yearly-report', 'users', 'lookups'],
  QA_SPECIALIST: ['dashboard', 'workload-entry', 'workload-list', 'yearly-report', 'users', 'lookups'],
  WORKER: ['dashboard', 'workload-entry', 'workload-list'],
};

const MENU_ITEMS = {
  'dashboard': { label: 'Dashboard', icon: LayoutDashboard },
  'workload-entry': { label: 'Workload entry', icon: ClipboardList },
  'workload-list': { label: 'Listings', icon: FolderOpen },
  'yearly-report': { label: 'Yearly Report', icon: BarChart3 },
  'users': { label: 'Users', icon: Users },
  'lookups': { label: 'Yönetim', icon: Settings },
};

// ==================== WORKLOAD CONTEXT (lookups + entries) ====================
// Activity types (CRUD edilebilir, ama 3 default)
// IDs are stable: 1 = Project, 2 = Non-Project, 3 = Self Improvement
const MOCK_ACTIVITY_TYPES = [
  { id: 1, code: 'PROJECT', name: 'Project Activity', description: 'Bir projeye yönelik çalışma', is_active: true },
  { id: 2, code: 'NON_PROJECT', name: 'Non-Project Activity', description: 'Proje dışı şirket içi faaliyetler', is_active: true },
  { id: 3, code: 'SELF_IMP', name: 'Self Capability Improvement', description: 'Eğitim, kurs, kişisel gelişim', is_active: true },
];

// Each activity type has its own category list. Same name can exist across lists.
const MOCK_PROJECT_CATEGORIES = [
  { id: 1, code: 'FRONTEND', name: 'Frontend', color: '#2DD4BF', is_active: true },
  { id: 2, code: 'BACKEND', name: 'Backend', color: '#3B82F6', is_active: true },
  { id: 3, code: 'DATABASE', name: 'Database', color: '#A78BFA', is_active: true },
  { id: 4, code: 'DEVOPS', name: 'DevOps', color: '#F59E0B', is_active: true },
  { id: 5, code: 'TESTING', name: 'Testing', color: '#EC4899', is_active: true },
  { id: 6, code: 'DESIGN', name: 'Design', color: '#10B981', is_active: true },
];

const MOCK_NON_PROJ_CATEGORIES = [
  { id: 1, code: 'MEETING', name: 'Toplantı', color: '#3B82F6', is_active: true },
  { id: 2, code: 'ADMIN', name: 'İdari işler', color: '#A78BFA', is_active: true },
  { id: 3, code: 'HR_BRIEF', name: 'HR Briefing', color: '#F59E0B', is_active: true },
  { id: 4, code: 'IT_SUPPORT', name: 'IT Support', color: '#EC4899', is_active: true },
  { id: 5, code: 'INTERVIEW', name: 'Mülakat', color: '#10B981', is_active: true },
];

const MOCK_SELF_IMP_CATEGORIES = [
  { id: 1, code: 'COURSE', name: 'Online Kurs', color: '#2DD4BF', is_active: true },
  { id: 2, code: 'CERT', name: 'Sertifikasyon', color: '#3B82F6', is_active: true },
  { id: 3, code: 'CONFERENCE', name: 'Konferans / Webinar', color: '#A78BFA', is_active: true },
  { id: 4, code: 'BOOK', name: 'Kitap / Makale', color: '#F59E0B', is_active: true },
  { id: 5, code: 'PRACTICE', name: 'Algoritma / Pratik', color: '#EC4899', is_active: true },
];

const MOCK_PROJECTS = [
  { id: 1, code: 'ATLAS', name: 'Atlas Platform', description: 'Ana ürün platformu', is_active: true },
  { id: 2, code: 'MOB-3', name: 'Mobile App v3', description: 'iOS ve Android uygulaması', is_active: true },
  { id: 3, code: 'DATA', name: 'Data Pipeline', description: 'Veri işleme altyapısı', is_active: true },
  { id: 4, code: 'INT', name: 'Internal Tools', description: 'Şirket içi araçlar', is_active: true },
  { id: 5, code: 'API-V2', name: 'API v2 Migration', description: 'Yeni API geçişi', is_active: true },
];

const MOCK_TASK_TYPES = [
  { id: 1, code: 'DEV', name: 'Development', is_active: true },
  { id: 2, code: 'MEETING', name: 'Meeting', is_active: true },
  { id: 3, code: 'REVIEW', name: 'Review', is_active: true },
  { id: 4, code: 'RESEARCH', name: 'Research', is_active: true },
  { id: 5, code: 'DOC', name: 'Documentation', is_active: true },
];

// Sample entries spread over recent days for the demo
const buildMockEntries = () => {
  // Build entries for 2026 only, for 10 users with mixed performance patterns
  // Users:
  //   EMP001 (Hakan Yıldız)   — overperformer (yeşil ağırlık)
  //   EMP003 (Kerem Bulut)    — overperformer (yeşil)
  //   EMP002 (İrem Acar)      — normal
  //   EMP004 (Lale Kurt)      — normal
  //   TL001  (Cem Öztürk)     — normal
  //   TL002  (Deniz Korkmaz)  — normal
  //   QA001  (Fatma Aslan)    — normal
  //   EMP008 (Pınar Akın)     — underperformer (sarı/kırmızı)
  //   EMP010 (Sema Tekin)     — underperformer (sarı/kırmızı)
  const userProfiles = [
    { account_id: 'EMP001', dailyHours: [7.5, 9],   pattern: 'over' },
    { account_id: 'EMP003', dailyHours: [8, 9.5],   pattern: 'over' },
    { account_id: 'EMP002', dailyHours: [7, 8.5],   pattern: 'normal' },
    { account_id: 'EMP004', dailyHours: [7, 8.5],   pattern: 'normal' },
    { account_id: 'TL001',  dailyHours: [7, 8.5],   pattern: 'normal' },
    { account_id: 'TL002',  dailyHours: [7, 8.5],   pattern: 'normal' },
    { account_id: 'QA001',  dailyHours: [7, 8.5],   pattern: 'normal' },
    { account_id: 'EMP008', dailyHours: [4.5, 6.5], pattern: 'under' },
    { account_id: 'EMP010', dailyHours: [4, 6],     pattern: 'under' },
    { account_id: 'TL003',  dailyHours: [3, 5],     pattern: 'low' },
  ];

  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);

  const descriptions = {
    1: ['API endpoint geliştirme', 'Dashboard component refactor', 'Bug fix - filter component', 'New feature: notification system', 'Database query optimization', 'Auth module implementation', 'Pagination logic', 'Mobile screen geliştirme', 'WebSocket integration', 'Form validation refactor'],
    2: ['Sprint planning', 'Daily standup', 'Retrospective', 'Product review', 'Architecture discussion', '1-on-1 meeting', 'Team sync', 'Stakeholder review'],
    3: ['PR review for auth module', 'Code review - frontend', 'Design review', 'Architecture review', 'Security audit review'],
    4: ['Performance profiling', 'New library evaluation', 'Caching strategy spike', 'Architecture proposal', 'POC for real-time feature'],
    5: ['API documentation update', 'README güncellemesi', 'Technical spec yazımı', 'Onboarding doc', 'Deployment guide'],
  };
  const selfImpDesc = ['Online kurs - React patterns', 'AWS sertifikası çalışması', 'Tech book reading', 'Konferans webinar', 'Pluralsight course', 'Algorithm practice'];
  const nonProjDesc = ['HR briefing', 'Şirket genel toplantısı', 'Idari işler', 'IT support', 'Onboarding yeni çalışan', 'Performans değerlendirme'];

  const complexities = ['low', 'medium', 'medium', 'medium', 'high'];
  // Status weights: completed çok yaygın, ongoing orta, blocked çok nadir
  const statuses = ['completed', 'completed', 'completed', 'completed', 'completed', 'ongoing', 'ongoing', 'blocked'];

  const realProjects = [1, 2, 3, 4, 5]; // Atlas, Mobile, Data, Internal, API-V2
  const projectCategoryIds = [1, 2, 3, 4, 5, 6]; // Frontend, Backend, Database, DevOps, Testing, Design
  const nonProjCategoryIds = [1, 2, 3, 4, 5];    // Toplantı, İdari, HR, IT, Mülakat
  const selfImpCategoryIds = [1, 2, 3, 4, 5];    // Kurs, Sertifika, Konferans, Kitap, Pratik
  const realTaskTypes = [1, 2, 3, 4, 5];

  // Activity type IDs (must match MOCK_ACTIVITY_TYPES)
  const ACTIVITY_PROJECT = 1;
  const ACTIVITY_NON_PROJECT = 2;
  const ACTIVITY_SELF_IMP = 3;

  // Seeded random for reproducibility
  let seed = 1234;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const randBetween = (min, max) => min + rand() * (max - min);
  const round25 = (v) => Math.round(v * 4) / 4; // round to 0.25

  const entries = [];
  let id = 1;

  // Iterate from Jan 1, 2026 to today
  const start = new Date(2026, 0, 1);
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // Skip weekends

    const dateStr = fmt(d);

    for (const profile of userProfiles) {
      const skipChance = profile.pattern === 'low' ? 0.30
                       : profile.pattern === 'under' ? 0.20
                       : profile.pattern === 'normal' ? 0.10
                       : 0.05;
      if (rand() < skipChance) continue;

      const [minH, maxH] = profile.dailyHours;
      let dayHours = round25(randBetween(minH, maxH));
      if (dayHours <= 0) continue;

      const slots = [];
      const r = rand();
      if (r < 0.65) {
        slots.push({ kind: 'project', hours: dayHours });
      } else if (r < 0.85) {
        const split = round25(dayHours * randBetween(0.3, 0.7));
        slots.push({ kind: 'project', hours: split });
        slots.push({ kind: 'project', hours: round25(dayHours - split) });
      } else if (r < 0.93) {
        const np = round25(randBetween(0.5, 1.5));
        const proj = round25(dayHours - np);
        if (proj > 0) slots.push({ kind: 'project', hours: proj });
        if (np > 0) slots.push({ kind: 'nonproj', hours: np });
      } else {
        const si = round25(randBetween(0.5, 1.5));
        const proj = round25(dayHours - si);
        if (proj > 0) slots.push({ kind: 'project', hours: proj });
        if (si > 0) slots.push({ kind: 'selfimp', hours: si });
      }

      for (const slot of slots) {
        if (slot.hours <= 0) continue;
        let activity_type_id, project_id, task_type_id, category_id, descPool;
        if (slot.kind === 'nonproj') {
          activity_type_id = ACTIVITY_NON_PROJECT;
          project_id = null;
          task_type_id = 2; // Meeting
          category_id = pick(nonProjCategoryIds);
          descPool = nonProjDesc;
        } else if (slot.kind === 'selfimp') {
          activity_type_id = ACTIVITY_SELF_IMP;
          project_id = null;
          task_type_id = 4; // Research
          category_id = pick(selfImpCategoryIds);
          descPool = selfImpDesc;
        } else {
          activity_type_id = ACTIVITY_PROJECT;
          project_id = pick(realProjects);
          task_type_id = pick(realTaskTypes);
          category_id = pick(projectCategoryIds);
          descPool = descriptions[task_type_id];
        }

        entries.push({
          id: id++,
          account_id: profile.account_id,
          work_date: dateStr,
          activity_type_id,
          category_id,
          project_id,
          task_type_id,
          task_description: pick(descPool),
          status: pick(statuses),
          quantity: rand() > 0.6 ? Math.floor(rand() * 6) + 1 : null,
          complexity: pick(complexities),
          hours_spent: slot.hours,
          created_at: dateStr,
        });
      }
    }
  }

  return entries;
};

const STATUS_OPTIONS = [
  { value: 'ongoing', label: 'Ongoing', color: '#F59E0B' },
  { value: 'completed', label: 'Completed', color: '#10B981' },
  { value: 'blocked', label: 'Blocked', color: '#EF4444' },
];

const COMPLEXITY_OPTIONS = [
  { value: 'low', label: 'Low', color: '#10B981' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'high', label: 'High', color: '#EF4444' },
];

const WorkloadContext = createContext(null);
const useWorkload = () => useContext(WorkloadContext);

const WorkloadProvider = ({ children }) => {
  const [activityTypes, setActivityTypes] = useState(MOCK_ACTIVITY_TYPES);
  const [projectCategories, setProjectCategories] = useState(MOCK_PROJECT_CATEGORIES);
  const [nonProjCategories, setNonProjCategories] = useState(MOCK_NON_PROJ_CATEGORIES);
  const [selfImpCategories, setSelfImpCategories] = useState(MOCK_SELF_IMP_CATEGORIES);
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [taskTypes, setTaskTypes] = useState(MOCK_TASK_TYPES);
  const [entries, setEntries] = useState(buildMockEntries());
  // expectedWorkingDays: { [year]: [12 items, default 22] }
  const [expectedWorkingDays, setExpectedWorkingDays] = useState({
    2026: [22, 20, 22, 22, 21, 22, 23, 22, 22, 22, 21, 22],
    2025: [22, 20, 21, 22, 21, 21, 23, 21, 22, 22, 20, 23],
  });

  // Returns the category list for a given activity_type_id
  const getCategoriesForActivity = (activityTypeId) => {
    if (activityTypeId === 1) return projectCategories;
    if (activityTypeId === 2) return nonProjCategories;
    if (activityTypeId === 3) return selfImpCategories;
    return [];
  };

  const findCategory = (activityTypeId, categoryId) => {
    return getCategoriesForActivity(activityTypeId).find(c => c.id === categoryId);
  };

  const getExpectedDays = (year, monthIndex) => {
    return (expectedWorkingDays[year] || Array(12).fill(22))[monthIndex];
  };

  const setExpectedDays = (year, monthIndex, value) => {
    setExpectedWorkingDays((prev) => {
      const arr = [...(prev[year] || Array(12).fill(22))];
      arr[monthIndex] = value;
      return { ...prev, [year]: arr };
    });
  };

  const addEntry = (entry) => {
    const newEntry = { ...entry, id: Date.now(), created_at: new Date().toISOString().slice(0, 10) };
    setEntries((prev) => [newEntry, ...prev]);
    return newEntry;
  };

  const updateEntry = (id, patch) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const deleteEntry = (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  // Edit window: only entries with work_date within last 30 days are editable/deletable
  const isEditable = (workDate) => {
    const d = new Date(workDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - d) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= -3650;
  };

  return (
    <WorkloadContext.Provider value={{
      activityTypes, setActivityTypes,
      projectCategories, setProjectCategories,
      nonProjCategories, setNonProjCategories,
      selfImpCategories, setSelfImpCategories,
      getCategoriesForActivity, findCategory,
      projects, setProjects,
      taskTypes, setTaskTypes,
      entries, addEntry, updateEntry, deleteEntry,
      isEditable,
      expectedWorkingDays, getExpectedDays, setExpectedDays,
    }}>
      {children}
    </WorkloadContext.Provider>
  );
};

// ==================== LOGIN SCREEN ====================
const LoginScreen = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    setError('');
    if (!email.trim() || !password) {
      setError('Email ve parola zorunludur');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const result = login(email, password);
      if (!result.success) setError(result.error);
      setLoading(false);
    }, 600);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(ellipse at top left, ${C.surface} 0%, ${C.bg} 50%), radial-gradient(ellipse at bottom right, #1E3A5F 0%, ${C.bg} 50%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: C.textPrimary,
    }}>
      <div style={{ width: '100%', maxWidth: 880, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center' }}>

        {/* LEFT: Branding panel */}
        <div style={{ padding: '40px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.bg, fontWeight: 700, fontSize: 22 }}>W</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>Workload</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>Tracking System</div>
            </div>
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 500, lineHeight: 1.2, margin: '0 0 16px' }}>
            Şirket workload <span style={{ color: C.teal }}>takibi</span> tek panelde
          </h1>
          <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, margin: '0 0 32px' }}>
            Çalışmalarını saat bazında kaydet, takım performansını izle, raporlar oluştur. Tüm şirket genelinde tek bir merkezi sistem.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { color: C.teal, text: 'Saat bazında detaylı workload kaydı' },
              { color: C.blue, text: 'Takım ve proje bazlı raporlama' },
              { color: C.purple, text: 'Rol bazlı yetki yönetimi' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: C.textSecondary }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.color }} />
                {item.text}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Login card */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: 32,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>Giriş yap</h2>
            <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>Hesabınla devam et</p>
          </div>

          <div onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}>
            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@company.com"
                  autoComplete="username"
                  style={{
                    width: '100%', padding: '11px 12px 11px 36px', boxSizing: 'border-box',
                    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7,
                    color: C.textPrimary, fontSize: 13, outline: 'none', fontFamily: 'inherit',
                  }}
                  onFocus={(e) => e.target.style.borderColor = C.borderFocus}
                  onBlur={(e) => e.target.style.borderColor = C.border}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Parola</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '11px 12px 11px 36px', boxSizing: 'border-box',
                    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7,
                    color: C.textPrimary, fontSize: 13, outline: 'none', fontFamily: 'inherit',
                  }}
                  onFocus={(e) => e.target.style.borderColor = C.borderFocus}
                  onBlur={(e) => e.target.style.borderColor = C.border}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
                padding: '10px 12px', background: `${C.red}1A`, border: `1px solid ${C.red}40`,
                borderRadius: 6, fontSize: 12, color: C.red,
              }}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%', padding: '12px', background: loading ? `${C.teal}80` : C.teal,
                border: 'none', borderRadius: 7, color: C.bg, fontSize: 14, fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8, marginBottom: 12, transition: 'all 0.15s',
              }}
            >
              {loading && <Loader2 size={14} className="spin" style={{ animation: 'spin 0.8s linear infinite' }} />}
              {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
            </button>

            {/* Forgot password info */}
            <div style={{ textAlign: 'center', fontSize: 11, color: C.textMuted }}>
              Parolanı mı unuttun? <span style={{ color: C.textSecondary }}>Yönetici ile iletişime geç.</span>
            </div>
          </div>

          {/* Mock test accounts hint */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <button
              onClick={() => setShowHint(!showHint)}
              style={{
                background: 'transparent', border: 'none', color: C.textMuted,
                fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0,
              }}
            >
              <span style={{ color: C.amber }}>●</span>
              Mock test hesapları {showHint ? '▲' : '▼'}
            </button>
            {showHint && (
              <div style={{ marginTop: 10, padding: 10, background: C.bg, borderRadius: 6, fontSize: 11, fontFamily: 'monospace', color: C.textSecondary, lineHeight: 1.7 }}>
                <div><span style={{ color: C.teal }}>admin@company.com</span> / admin123 <span style={{ color: C.textMuted }}>(Admin)</span></div>
                <div><span style={{ color: C.blue }}>hr.manager@company.com</span> / hr123 <span style={{ color: C.textMuted }}>(HR)</span></div>
                <div><span style={{ color: C.purple }}>eng.manager@company.com</span> / mgr123 <span style={{ color: C.textMuted }}>(Manager)</span></div>
                <div><span style={{ color: C.amber }}>frontend.lead@company.com</span> / tl123 <span style={{ color: C.textMuted }}>(Tech Lead)</span></div>
                <div><span style={{ color: C.pink }}>qa.lead@company.com</span> / qa123 <span style={{ color: C.textMuted }}>(QA)</span></div>
                <div><span style={{ color: C.green }}>developer1@company.com</span> / pass123 <span style={{ color: C.textMuted }}>(Worker)</span></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ==================== TOP NAV (shared layout) ====================
const TopNav = () => {
  const { currentUser, logout, getUserRole, getUserTeam } = useAuth();
  const { currentRoute, navigate } = useRouter();
  const role = getUserRole(currentUser);
  const team = getUserTeam(currentUser);
  const allowedMenu = MENU_BY_ROLE[role?.code] || [];
  const [profileOpen, setProfileOpen] = useState(false);

  const initials = currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{
      background: 'linear-gradient(180deg, #0F1F3A 0%, #0A1628 100%)',
      padding: '14px 24px',
      borderBottom: `1px solid rgba(45, 212, 191, 0.15)`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.bg, fontWeight: 700, fontSize: 14 }}>W</div>
          <span style={{ fontSize: 15, fontWeight: 500 }}>Workload</span>
        </div>
        <nav style={{ display: 'flex', gap: 2, fontSize: 13 }}>
          {allowedMenu.map((key) => {
            const item = MENU_ITEMS[key];
            const Icon = item.icon;
            const active = currentRoute === key;
            return (
              <button
                key={key}
                onClick={() => navigate(key)}
                style={{
                  padding: '6px 12px', borderRadius: 6,
                  background: active ? `${C.teal}1F` : 'transparent',
                  color: active ? C.teal : C.textSecondary,
                  border: 'none', cursor: 'pointer', fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = C.surfaceHover; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon size={13} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
        <div style={{ fontSize: 11, color: C.textMuted, padding: '4px 10px', border: `1px solid ${C.border}`, borderRadius: 6 }}>
          {role?.name}
        </div>
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 4px 4px',
            background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 20,
            cursor: 'pointer', color: C.textPrimary, fontFamily: 'inherit',
          }}
        >
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#BFDBFE' }}>{initials}</div>
          <span style={{ fontSize: 12 }}>{currentUser.name.split(' ')[0]}</span>
        </button>

        {profileOpen && (
          <>
            <div onClick={() => setProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 8,
              minWidth: 240, zIndex: 50, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.textPrimary }}>{currentUser.name}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{currentUser.email}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', background: `${C.teal}1A`, color: C.teal, borderRadius: 3 }}>{role?.name}</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', background: `${C.blue}1A`, color: C.blue, borderRadius: 3 }}>{team?.name}</span>
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>{currentUser.position}</div>
                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4, fontFamily: 'monospace' }}>ID: {currentUser.account_id}</div>
              </div>
              <button
                onClick={() => { logout(); setProfileOpen(false); }}
                style={{
                  width: '100%', padding: '10px 16px', background: 'transparent',
                  border: 'none', cursor: 'pointer', color: C.red, fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', textAlign: 'left',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = `${C.red}1A`}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={13} />
                Çıkış yap
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ==================== USERS PAGE ====================
const ROLE_COLORS = {
  ADMIN: C.red, HR: C.amber, MANAGER: C.purple, TECH_LEAD: C.teal, QA_SPECIALIST: C.pink, WORKER: C.blue,
};
const TEAM_COLORS = {
  Engineering: C.teal, Product: C.purple, Design: C.pink, QA: C.amber, DevOps: C.blue, Marketing: C.green,
};

const Avatar = ({ name, size = 32 }) => {
  const initials = (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: '#1E40AF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, color: '#BFDBFE', flexShrink: 0,
    }}>{initials}</div>
  );
};

const Badge = ({ color, children, size = 'sm' }) => (
  <span style={{
    fontSize: size === 'sm' ? 10 : 11,
    padding: size === 'sm' ? '2px 8px' : '3px 10px',
    background: `${color}1A`, color, borderRadius: 4,
    fontWeight: 500, whiteSpace: 'nowrap',
    border: `1px solid ${color}33`,
  }}>{children}</span>
);

const FilterDropdown = ({ value, options, onChange, placeholder, icon: Icon }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '7px 10px 7px 12px', background: C.surface,
          border: `1px solid ${value !== null && value !== '' ? C.borderHover : C.border}`,
          borderRadius: 6, fontSize: 12, color: C.textPrimary,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          fontFamily: 'inherit', minWidth: 130,
        }}
      >
        {Icon && <Icon size={12} color={C.textMuted} />}
        <span style={{ flex: 1, textAlign: 'left' }}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={12} color={C.textMuted} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: C.surface, border: `1px solid ${C.borderHover}`,
            borderRadius: 6, zIndex: 40, overflow: 'hidden', maxHeight: 280, overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            {options.map((opt) => (
              <div
                key={opt.value ?? 'all'}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  padding: '8px 12px', fontSize: 12, color: C.textPrimary, cursor: 'pointer',
                  background: value === opt.value ? `${C.teal}1A` : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceHover}
                onMouseLeave={(e) => e.currentTarget.style.background = value === opt.value ? `${C.teal}1A` : 'transparent'}
              >
                {opt.dotColor && <span style={{ width: 8, height: 8, borderRadius: 2, background: opt.dotColor }} />}
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const FormInput = ({ label, value, onChange, type = 'text', placeholder, required, readOnly, error }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
      {label} {required && <span style={{ color: C.red }}>*</span>}
    </label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      style={{
        width: '100%', padding: '10px 12px', boxSizing: 'border-box',
        background: readOnly ? C.surfaceDeep : C.bg,
        border: `1px solid ${error ? C.red : C.border}`, borderRadius: 6,
        color: readOnly ? C.textMuted : C.textPrimary, fontSize: 13, outline: 'none',
        fontFamily: 'inherit', cursor: readOnly ? 'not-allowed' : 'text',
      }}
      onFocus={(e) => { if (!readOnly) e.target.style.borderColor = C.borderFocus; }}
      onBlur={(e) => { if (!readOnly) e.target.style.borderColor = error ? C.red : C.border; }}
    />
    {error && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.red, marginTop: 4 }}>
        <AlertCircle size={11} /> {error}
      </div>
    )}
  </div>
);

const FormSelect = ({ label, value, options, onChange, required, placeholder }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        {label} {required && <span style={{ color: C.red }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            width: '100%', padding: '10px 12px',
            background: C.bg, border: `1px solid ${open ? C.borderFocus : C.border}`,
            borderRadius: 6, fontSize: 13, color: selected ? C.textPrimary : C.textMuted,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
          }}
        >
          <span>{selected ? selected.label : (placeholder || 'Seç...')}</span>
          <ChevronDown size={14} color={C.textMuted} />
        </button>
        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
              background: C.surface, border: `1px solid ${C.borderFocus}`,
              borderRadius: 6, zIndex: 40, overflow: 'hidden', maxHeight: 240, overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {options.map((opt) => (
                <div
                  key={opt.value ?? 'none'}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  style={{
                    padding: '10px 12px', fontSize: 13, color: C.textPrimary, cursor: 'pointer',
                    background: value === opt.value ? `${C.teal}1A` : 'transparent',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceHover}
                  onMouseLeave={(e) => e.currentTarget.style.background = value === opt.value ? `${C.teal}1A` : 'transparent'}
                >
                  {opt.dotColor && <span style={{ width: 8, height: 8, borderRadius: 2, background: opt.dotColor }} />}
                  {opt.label}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ConfirmDialog = ({ title, message, onConfirm, onCancel, confirmLabel = 'Onayla', danger }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  }}>
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: 24, maxWidth: 400, width: '100%',
    }}>
      <div style={{ fontSize: 16, fontWeight: 500, color: C.textPrimary, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20, lineHeight: 1.5 }}>{message}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 16px', background: 'transparent',
            border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.textSecondary, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >İptal</button>
        <button
          onClick={onConfirm}
          style={{
            padding: '8px 16px', background: danger ? C.red : C.teal,
            border: 'none', borderRadius: 6,
            color: danger ? '#fff' : C.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >{confirmLabel}</button>
      </div>
    </div>
  </div>
);

const PasswordResetDialog = ({ user, onClose, onConfirm }) => {
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!newPwd) return setError('Yeni parola boş olamaz');
    if (newPwd.length < 6) return setError('Parola en az 6 karakter olmalı');
    if (newPwd !== confirm) return setError('Parolalar eşleşmiyor');
    onConfirm(newPwd);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
        padding: 24, maxWidth: 420, width: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <KeyRound size={18} color={C.amber} />
          <div style={{ fontSize: 16, fontWeight: 500, color: C.textPrimary }}>Parola sıfırla</div>
        </div>
        <div style={{ fontSize: 13, color: C.textSecondary, marginBottom: 20 }}>
          <span style={{ color: C.textPrimary, fontWeight: 500 }}>{user.name}</span> için yeni parola belirle.
        </div>
        <FormInput label="Yeni parola" type="password" value={newPwd} onChange={setNewPwd} placeholder="En az 6 karakter" required />
        <FormInput label="Parola tekrar" type="password" value={confirm} onChange={setConfirm} placeholder="Parolayı tekrar gir" required error={error} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textSecondary, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>İptal</button>
          <button onClick={handleSubmit} style={{ padding: '8px 16px', background: C.amber, border: 'none', borderRadius: 6, color: C.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Sıfırla</button>
        </div>
      </div>
    </div>
  );
};

const UsersPage = () => {
  const { currentUser, users, setUsers, roles, teams, getUserRole } = useAuth();
  const currentRole = getUserRole(currentUser);
  const isAdmin = currentRole?.code === 'ADMIN';

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState(null);
  const [filterTeam, setFilterTeam] = useState(null);
  const [filterStatus, setFilterStatus] = useState('active');
  const [selectedId, setSelectedId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pwdReset, setPwdReset] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (filterStatus === 'active' && !u.is_active) return false;
      if (filterStatus === 'inactive' && u.is_active) return false;
      if (filterRole && u.role_id !== filterRole) return false;
      if (filterTeam && u.team_id !== filterTeam) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.account_id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [users, search, filterRole, filterTeam, filterStatus]);

  const selectedUser = users.find(u => u.id === selectedId);

  const startCreate = () => {
    setIsCreating(true);
    setSelectedId(null);
    setEditForm({
      account_id: '', email: '', name: '', password: '',
      position: '', role_id: 6, team_id: 1, manager_account_id: null, is_active: true,
    });
  };

  const startEdit = (user) => {
    setIsCreating(false);
    setSelectedId(user.id);
    setEditForm({ ...user });
  };

  const closeEdit = () => {
    setSelectedId(null);
    setIsCreating(false);
    setEditForm(null);
  };

  const handleSave = () => {
    if (!editForm.name?.trim() || !editForm.email?.trim() || !editForm.account_id?.trim()) {
      showToast('Zorunlu alanları doldurun', 'error');
      return;
    }
    if (isCreating) {
      if (!editForm.password) {
        showToast('Yeni kullanıcı için parola zorunlu', 'error');
        return;
      }
      if (users.some(u => u.email.toLowerCase() === editForm.email.toLowerCase())) {
        showToast('Bu email zaten kullanılıyor', 'error');
        return;
      }
      if (users.some(u => u.account_id.toLowerCase() === editForm.account_id.toLowerCase())) {
        showToast('Bu account ID zaten kullanılıyor', 'error');
        return;
      }
      const newUser = {
        ...editForm, id: Date.now(),
        created_at: new Date().toISOString().slice(0, 10),
      };
      setUsers([...users, newUser]);
      showToast(`${newUser.name} eklendi`);
      setSelectedId(newUser.id);
      setIsCreating(false);
    } else {
      setUsers(users.map(u => u.id === editForm.id ? { ...editForm } : u));
      showToast('Değişiklikler kaydedildi');
    }
  };

  const handleSoftDelete = () => {
    setUsers(users.map(u => u.id === selectedUser.id ? { ...u, is_active: false } : u));
    showToast(`${selectedUser.name} pasif duruma alındı`);
    setConfirmDelete(false);
    closeEdit();
  };

  const handlePwdReset = (newPwd) => {
    setUsers(users.map(u => u.id === selectedUser.id ? { ...u, password: newPwd } : u));
    setPwdReset(false);
    showToast('Parola sıfırlandı');
  };

  const handleReactivate = () => {
    setUsers(users.map(u => u.id === selectedUser.id ? { ...u, is_active: true } : u));
    showToast(`${selectedUser.name} aktif duruma alındı`);
  };

  const isDirty = editForm && selectedUser && JSON.stringify(editForm) !== JSON.stringify(selectedUser);

  return (
    <div style={{ padding: 24, position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px', color: C.textPrimary }}>Kullanıcılar</h1>
          <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>
            {filteredUsers.length} / {users.length} kullanıcı listeleniyor
          </p>
        </div>
        <button
          onClick={startCreate}
          style={{
            padding: '9px 16px', background: C.teal, border: 'none', borderRadius: 6,
            color: C.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
          }}
        >
          <UserPlus size={14} /> Yeni kullanıcı
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={14} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim, email veya account ID'ye göre ara..."
            style={{
              width: '100%', padding: '8px 12px 8px 34px', boxSizing: 'border-box',
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.textPrimary, fontSize: 13, outline: 'none', fontFamily: 'inherit',
            }}
            onFocus={(e) => e.target.style.borderColor = C.borderFocus}
            onBlur={(e) => e.target.style.borderColor = C.border}
          />
        </div>
        <FilterDropdown
          icon={Filter}
          value={filterRole}
          onChange={setFilterRole}
          placeholder="Tüm roller"
          options={[
            { value: null, label: 'Tüm roller' },
            ...roles.map(r => ({ value: r.id, label: r.name, dotColor: ROLE_COLORS[r.code] })),
          ]}
        />
        <FilterDropdown
          value={filterTeam}
          onChange={setFilterTeam}
          placeholder="Tüm takımlar"
          options={[
            { value: null, label: 'Tüm takımlar' },
            ...teams.map(t => ({ value: t.id, label: t.name, dotColor: TEAM_COLORS[t.name] })),
          ]}
        />
        <FilterDropdown
          value={filterStatus}
          onChange={setFilterStatus}
          placeholder="Durum"
          options={[
            { value: 'active', label: 'Aktif', dotColor: C.green },
            { value: 'inactive', label: 'Pasif', dotColor: C.textMuted },
            { value: 'all', label: 'Tümü' },
          ]}
        />
      </div>

      {/* Main: Table + side panel */}
      <div style={{ display: 'grid', gridTemplateColumns: editForm ? '1fr 420px' : '1fr', gap: 14, transition: 'grid-template-columns 0.2s' }}>
        {/* TABLE */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.surfaceDeep, borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Kullanıcı</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Email</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Takım</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Yönetici</th>
                  {!editForm && <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Pozisyon</th>}
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={editForm ? 5 : 6} style={{ padding: '60px 20px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
                      Filtreyle eşleşen kullanıcı bulunamadı.
                    </td>
                  </tr>
                ) : filteredUsers.map((u) => {
                  const team = teams.find(t => t.id === u.team_id);
                  const manager = u.manager_account_id ? users.find(x => x.account_id === u.manager_account_id) : null;
                  const active = selectedId === u.id;
                  return (
                    <tr
                      key={u.id}
                      onClick={() => startEdit(u)}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: active ? `${C.teal}0F` : 'transparent',
                        cursor: 'pointer', transition: 'background 0.12s',
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = C.surfaceHover; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={u.name} size={30} />
                          <div>
                            <div style={{ color: C.textPrimary, fontWeight: 500, fontSize: 13 }}>{u.name}</div>
                            <div style={{ color: C.textMuted, fontSize: 11, fontFamily: 'monospace' }}>{u.account_id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: C.textSecondary, fontSize: 12 }}>{u.email}</td>
                      <td style={{ padding: '10px 14px' }}>{team && <Badge color={TEAM_COLORS[team.name]}>{team.name}</Badge>}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>
                        {manager ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar name={manager.name} size={22} />
                            <span style={{ color: C.textSecondary }}>{manager.name}</span>
                          </div>
                        ) : (
                          <span style={{ color: C.textMuted, fontSize: 11, fontStyle: 'italic' }}>—</span>
                        )}
                      </td>
                      {!editForm && <td style={{ padding: '10px 14px', color: C.textSecondary, fontSize: 12 }}>{u.position}</td>}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                          background: u.is_active ? C.green : C.textMuted,
                        }} title={u.is_active ? 'Aktif' : 'Pasif'} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SIDE PANEL */}
        {editForm && (
          <div style={{ background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 10, height: 'fit-content', position: 'sticky', top: 14 }}>
            {/* Panel header */}
            <div style={{ padding: '16px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={editForm.name || (isCreating ? '?' : '?')} size={42} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.textPrimary }}>
                    {isCreating ? 'Yeni kullanıcı' : editForm.name}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                    {isCreating ? 'Bilgileri doldur' : editForm.email}
                  </div>
                </div>
              </div>
              <button
                onClick={closeEdit}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 4, borderRadius: 4 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.textPrimary; e.currentTarget.style.background = C.surfaceHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <div style={{ padding: 18, maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <FormInput label="Account ID" value={editForm.account_id} onChange={(v) => setEditForm({ ...editForm, account_id: v })} required readOnly={!isCreating} placeholder="EMP012" />
                <FormInput label="Status" value={editForm.is_active ? 'Aktif' : 'Pasif'} onChange={() => {}} readOnly />
              </div>
              <FormInput label="Ad Soyad" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} required placeholder="Örn. Ali Veli" />
              <FormInput label="Email" type="email" value={editForm.email} onChange={(v) => setEditForm({ ...editForm, email: v })} required placeholder="ornek@company.com" />
              {isCreating && (
                <FormInput label="Parola" type="password" value={editForm.password} onChange={(v) => setEditForm({ ...editForm, password: v })} required placeholder="En az 6 karakter" />
              )}
              <FormInput label="Pozisyon" value={editForm.position} onChange={(v) => setEditForm({ ...editForm, position: v })} placeholder="Örn. Senior Developer" />

              <FormSelect
                label="Rol" required
                value={editForm.role_id}
                onChange={(v) => setEditForm({ ...editForm, role_id: v })}
                options={roles.map(r => ({ value: r.id, label: r.name, dotColor: ROLE_COLORS[r.code] }))}
              />
              <FormSelect
                label="Takım" required
                value={editForm.team_id}
                onChange={(v) => setEditForm({ ...editForm, team_id: v })}
                options={teams.map(t => ({ value: t.id, label: t.name, dotColor: TEAM_COLORS[t.name] }))}
              />
              <FormSelect
                label="Manager"
                value={editForm.manager_account_id}
                onChange={(v) => setEditForm({ ...editForm, manager_account_id: v })}
                placeholder="Manager seç (opsiyonel)"
                options={[
                  { value: null, label: '— Manager yok —' },
                  ...users
                    .filter(u => u.is_active && u.account_id !== editForm.account_id)
                    .map(u => ({ value: u.account_id, label: `${u.name} (${u.account_id})` })),
                ]}
              />

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 6, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
                <button
                  onClick={handleSave}
                  disabled={!isCreating && !isDirty}
                  style={{
                    flex: 1, minWidth: 120, padding: '10px',
                    background: (isCreating || isDirty) ? C.teal : `${C.teal}40`,
                    border: 'none', borderRadius: 6,
                    color: C.bg, fontSize: 13, fontWeight: 600,
                    cursor: (isCreating || isDirty) ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    fontFamily: 'inherit', transition: 'all 0.15s',
                  }}
                >
                  {isCreating ? <><UserPlus size={14} /> Oluştur</> : <><Save size={14} /> Kaydet</>}
                </button>

                {!isCreating && isAdmin && (
                  <button
                    onClick={() => setPwdReset(true)}
                    style={{
                      padding: '10px 12px', background: 'transparent',
                      border: `1px solid ${C.amber}40`, borderRadius: 6,
                      color: C.amber, fontSize: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = `${C.amber}1A`}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <KeyRound size={13} /> Parola sıfırla
                  </button>
                )}

                {!isCreating && (
                  selectedUser?.is_active ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      disabled={selectedUser?.id === currentUser.id}
                      title={selectedUser?.id === currentUser.id ? 'Kendi hesabınızı pasif yapamazsınız' : ''}
                      style={{
                        padding: '10px 12px', background: 'transparent',
                        border: `1px solid ${C.red}40`, borderRadius: 6,
                        color: C.red, fontSize: 12,
                        cursor: selectedUser?.id === currentUser.id ? 'not-allowed' : 'pointer',
                        opacity: selectedUser?.id === currentUser.id ? 0.4 : 1,
                        display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                      }}
                      onMouseEnter={(e) => { if (selectedUser?.id !== currentUser.id) e.currentTarget.style.background = `${C.red}1A`; }}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Power size={13} /> Pasif yap
                    </button>
                  ) : (
                    <button
                      onClick={handleReactivate}
                      style={{
                        padding: '10px 12px', background: 'transparent',
                        border: `1px solid ${C.green}40`, borderRadius: 6,
                        color: C.green, fontSize: 12, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = `${C.green}1A`}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Power size={13} /> Aktif yap
                    </button>
                  )
                )}
              </div>

              {!isCreating && selectedUser && (
                <div style={{ marginTop: 14, fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>
                  Oluşturulma: {selectedUser.created_at}
                  {selectedUser.id === currentUser.id && (
                    <div style={{ marginTop: 4, color: C.amber }}>● Bu sizin hesabınız</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {confirmDelete && (
        <ConfirmDialog
          title="Kullanıcıyı pasif yap"
          message={`${selectedUser.name} pasif duruma alınacak. Listeden gizlenecek ama veriler korunacak. Daha sonra tekrar aktif edebilirsiniz.`}
          onConfirm={handleSoftDelete}
          onCancel={() => setConfirmDelete(false)}
          confirmLabel="Pasif yap"
          danger
        />
      )}
      {pwdReset && (
        <PasswordResetDialog
          user={selectedUser}
          onClose={() => setPwdReset(false)}
          onConfirm={handlePwdReset}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          padding: '12px 18px',
          background: toast.type === 'error' ? C.red : C.surface,
          border: `1px solid ${toast.type === 'error' ? C.red : C.borderHover}`,
          borderRadius: 8, color: toast.type === 'error' ? '#fff' : C.textPrimary,
          fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {toast.type === 'error' ? <AlertCircle size={14} /> : <Check size={14} color={C.green} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
};

// ==================== WORKLOAD ENTRY PAGE ====================
const WorkloadField = ({ label, icon: Icon, required, optional, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {Icon && <Icon size={11} />}
      <span>{label}</span>
      {required && <span style={{ color: C.red }}>*</span>}
      {optional && (
        <span style={{ fontSize: 10, color: C.textMuted, padding: '1px 6px', border: `1px solid ${C.border}`, borderRadius: 3, textTransform: 'none', letterSpacing: 0 }}>opsiyonel</span>
      )}
    </div>
    {children}
  </div>
);

const WorkloadSelect = ({ value, options, onChange, placeholder, displayKey = 'name', valueKey = 'id', renderItem }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o[valueKey] === value);
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '10px 12px',
          background: C.bg, border: `1px solid ${open ? C.borderFocus : C.border}`,
          borderRadius: 6, fontSize: 13, color: selected ? C.textPrimary : C.textMuted,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        <span>{selected ? (renderItem ? renderItem(selected) : selected[displayKey]) : placeholder}</span>
        <ChevronDown size={14} color={C.textMuted} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: C.surface, border: `1px solid ${C.borderFocus}`,
            borderRadius: 6, zIndex: 40, overflow: 'hidden', maxHeight: 240, overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            {options.length === 0 ? (
              <div style={{ padding: '14px 12px', fontSize: 12, color: C.textMuted, textAlign: 'center' }}>Henüz seçenek yok</div>
            ) : options.map((opt) => (
              <div
                key={opt[valueKey]}
                onClick={() => { onChange(opt[valueKey]); setOpen(false); }}
                style={{
                  padding: '10px 12px', fontSize: 13, color: C.textPrimary, cursor: 'pointer',
                  background: value === opt[valueKey] ? `${C.teal}1A` : 'transparent',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceHover}
                onMouseLeave={(e) => e.currentTarget.style.background = value === opt[valueKey] ? `${C.teal}1A` : 'transparent'}
              >
                {renderItem ? renderItem(opt) : opt[displayKey]}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const SegmentedControl = ({ value, options, onChange }) => (
  <div style={{ display: 'flex', gap: 6 }}>
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          type="button"
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1, padding: '10px 12px',
            background: active ? `${opt.color}1F` : C.bg,
            border: `1px solid ${active ? opt.color : C.border}`,
            borderRadius: 6, fontSize: 13,
            color: active ? opt.color : C.textSecondary,
            fontWeight: active ? 500 : 400,
            cursor: 'pointer', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontFamily: 'inherit',
          }}
        >
          {opt.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: opt.color }} />}
          {opt.label}
        </button>
      );
    })}
  </div>
);

const EntryRow = ({ entry, findCategory, activityTypes, projects, taskTypes, isEditable, onDelete, onEdit }) => {
  const cat = findCategory(entry.activity_type_id, entry.category_id);
  const proj = entry.project_id ? projects.find(p => p.id === entry.project_id) : null;
  const tt = taskTypes.find(t => t.id === entry.task_type_id);
  const activity = activityTypes.find(a => a.id === entry.activity_type_id);
  const editable = isEditable(entry.work_date);
  const complexityColor = COMPLEXITY_OPTIONS.find(c => c.value === entry.complexity)?.color || C.textMuted;
  const statusColor = STATUS_OPTIONS.find(s => s.value === entry.status)?.color || C.textMuted;

  return (
    <div style={{
      padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`,
      borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{ width: 3, alignSelf: 'stretch', background: cat?.color || C.teal, borderRadius: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
          {proj ? (
            <span style={{ fontSize: 12, fontWeight: 500, color: C.textPrimary }}>{proj.name}</span>
          ) : activity ? (
            <span style={{ fontSize: 12, fontWeight: 500, color: C.textPrimary }}>{activity.name}</span>
          ) : null}
          {cat && <span style={{ fontSize: 10, color: cat.color, padding: '1px 6px', background: `${cat.color}1A`, borderRadius: 3 }}>{cat.name}</span>}
          {tt && <span style={{ fontSize: 10, color: C.textMuted, padding: '1px 6px', border: `1px solid ${C.border}`, borderRadius: 3 }}>{tt.name}</span>}
          <span style={{ fontSize: 10, color: complexityColor, padding: '1px 6px', background: `${complexityColor}1A`, borderRadius: 3, textTransform: 'capitalize' }}>{entry.complexity}</span>
        </div>
        <div style={{ fontSize: 11, color: C.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.task_description}
          {entry.quantity != null && <span style={{ marginLeft: 6, color: C.textMuted }}>· qty {entry.quantity}</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: C.teal }}>{entry.hours_spent}h</div>
        <div style={{ fontSize: 10, color: statusColor, display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
          {entry.status === 'completed' ? 'tamam' : entry.status === 'blocked' ? 'blok' : 'devam'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        {editable ? (
          <>
            <button
              onClick={() => onEdit(entry)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: C.textMuted }}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.teal; e.currentTarget.style.background = `${C.teal}1A`; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; }}
              title="Düzenle"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => onDelete(entry.id)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: C.textMuted }}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.red; e.currentTarget.style.background = `${C.red}1A`; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; }}
              title="Sil"
            >
              <Trash2 size={13} />
            </button>
          </>
        ) : (
          <span title="30 günden eski kayıt - düzenlenemez" style={{ padding: 4, color: C.textMuted, display: 'inline-flex' }}>
            <LockIcon size={13} />
          </span>
        )}
      </div>
    </div>
  );
};

const WorkloadEntryPage = () => {
  const { currentUser } = useAuth();
  const { activityTypes, getCategoriesForActivity, findCategory, projects, taskTypes, entries, addEntry, updateEntry, deleteEntry, isEditable } = useWorkload();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [editingId, setEditingId] = useState(null); // null = create mode
  const emptyForm = {
    activity_type_id: null,
    category_id: null, project_id: null, task_type_id: null,
    task_description: '', status: 'ongoing', complexity: 'medium',
    quantity: '', hours_spent: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // Filter entries: only current user, only selected date, sorted newest first
  const dayEntries = useMemo(() => {
    return entries
      .filter(e => e.account_id === currentUser.account_id && e.work_date === date)
      .sort((a, b) => b.id - a.id);
  }, [entries, currentUser.account_id, date]);

  const dayTotal = useMemo(() => dayEntries.reduce((s, e) => s + parseFloat(e.hours_spent || 0), 0), [dayEntries]);

  const dateLocked = !isEditable(date);

  // Project is required only when activity_type is "Project Activity" (id=1)
  const isProjectActivity = form.activity_type_id === 1;
  const isValid = form.activity_type_id && form.category_id && form.task_type_id &&
    (isProjectActivity ? form.project_id : true) &&
    form.task_description.trim() && form.hours_spent && parseFloat(form.hours_spent) > 0;

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  // When activity type changes, reset category and project (because cat lists differ; project only valid for project activity)
  const handleActivityTypeChange = (newId) => {
    setForm({ ...form, activity_type_id: newId, category_id: null, project_id: null });
  };

  const handleSubmit = () => {
    if (!isValid) {
      showToast('Zorunlu alanları doldur', 'error');
      return;
    }
    if (dateLocked) {
      showToast('Bu tarih düzenlenemez (30 günden eski)', 'error');
      return;
    }
    const payload = {
      account_id: currentUser.account_id,
      work_date: date,
      activity_type_id: form.activity_type_id,
      category_id: form.category_id,
      project_id: isProjectActivity ? form.project_id : null,
      task_type_id: form.task_type_id,
      task_description: form.task_description.trim(),
      status: form.status,
      complexity: form.complexity,
      quantity: form.quantity === '' ? null : parseInt(form.quantity),
      hours_spent: parseFloat(form.hours_spent),
    };
    if (editingId) {
      updateEntry(editingId, payload);
      showToast('Kayıt güncellendi');
    } else {
      addEntry(payload);
      showToast('Workload eklendi');
    }
    resetForm();
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      activity_type_id: entry.activity_type_id || 1,
      category_id: entry.category_id,
      project_id: entry.project_id,
      task_type_id: entry.task_type_id,
      task_description: entry.task_description,
      status: entry.status,
      complexity: entry.complexity,
      quantity: entry.quantity == null ? '' : String(entry.quantity),
      hours_spent: String(entry.hours_spent),
    });
  };

  const handleDeleteConfirmed = () => {
    deleteEntry(confirmDelete);
    setConfirmDelete(null);
    if (editingId === confirmDelete) resetForm();
    showToast('Kayıt silindi');
  };

  const activeActivityTypes = activityTypes.filter(a => a.is_active);
  const activeCategories = form.activity_type_id ? getCategoriesForActivity(form.activity_type_id).filter(c => c.is_active) : [];
  const activeProjects = projects.filter(p => p.is_active);
  const activeTaskTypes = taskTypes.filter(t => t.is_active);

  return (
    <div style={{ padding: 24, position: 'relative' }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px', color: C.textPrimary }}>Workload girişi</h1>
        <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>Günlük çalışmalarını kaydet</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
        {/* FORM */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20 }}>
          {/* Date picker - prominent */}
          <div style={{
            padding: 14, background: C.bg,
            border: `1px solid ${dateLocked ? C.amber + '60' : C.borderHover}`,
            borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Calendar size={18} color={dateLocked ? C.amber : C.teal} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Çalışma tarihi</div>
              <input
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); resetForm(); }}
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  color: C.textPrimary, fontSize: 15, fontWeight: 500,
                  fontFamily: 'inherit', colorScheme: 'dark', padding: 0,
                }}
              />
            </div>
            {date !== today && (
              <button
                onClick={() => { setDate(today); resetForm(); }}
                style={{
                  padding: '6px 12px', background: 'transparent',
                  border: `1px solid ${C.border}`, borderRadius: 5,
                  color: C.textSecondary, fontSize: 11, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >Bugün</button>
            )}
          </div>

          {dateLocked && (
            <div style={{
              padding: '10px 12px', background: `${C.amber}1A`, border: `1px solid ${C.amber}40`,
              borderRadius: 6, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12, color: C.amber,
            }}>
              <AlertCircle size={13} />
              Bu tarih 30 günden eski. Yeni giriş yapılamaz, mevcut kayıtlar düzenlenemez.
            </div>
          )}

          {editingId && (
            <div style={{
              padding: '10px 12px', background: `${C.teal}1A`, border: `1px solid ${C.teal}40`,
              borderRadius: 6, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: 12, color: C.teal,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit2 size={13} /> Kayıt düzenleme modu
              </span>
              <button
                onClick={resetForm}
                style={{ background: 'transparent', border: 'none', color: C.teal, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', textDecoration: 'underline' }}
              >Yeni kayda dön</button>
            </div>
          )}

          {/* Activity type — full width on top */}
          <div style={{ marginBottom: 14 }}>
            <WorkloadField label="Activity type" icon={Activity} required>
              <SegmentedControl
                value={form.activity_type_id}
                onChange={handleActivityTypeChange}
                options={activeActivityTypes.map((a) => {
                  const colorMap = { 1: C.teal, 2: C.amber, 3: C.purple };
                  return { value: a.id, label: a.name, color: colorMap[a.id] || C.blue, dot: true };
                })}
              />
            </WorkloadField>
          </div>

          {/* Form fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <WorkloadField label="Kategori" icon={Tag} required>
              <WorkloadSelect
                value={form.category_id}
                options={activeCategories}
                onChange={(v) => setForm({ ...form, category_id: v })}
                placeholder={form.activity_type_id ? "Kategori seç..." : "Önce activity type seç"}
                renderItem={(c) => (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
                    {c.name}
                  </span>
                )}
              />
            </WorkloadField>

            {isProjectActivity ? (
              <WorkloadField label="Proje" icon={FolderOpen} required>
                <WorkloadSelect
                  value={form.project_id}
                  options={activeProjects}
                  onChange={(v) => setForm({ ...form, project_id: v })}
                  placeholder="Proje seç..."
                  renderItem={(p) => (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span>{p.name}</span>
                      <span style={{ fontSize: 10, color: C.textMuted, fontFamily: 'monospace' }}>{p.code}</span>
                    </span>
                  )}
                />
              </WorkloadField>
            ) : (
              // Placeholder cell to keep grid layout consistent when project is hidden
              <div />
            )}

            <WorkloadField label="Task type" icon={Layers} required>
              <WorkloadSelect
                value={form.task_type_id}
                options={activeTaskTypes}
                onChange={(v) => setForm({ ...form, task_type_id: v })}
                placeholder="Tip seç..."
              />
            </WorkloadField>

            <WorkloadField label="Hours spent" icon={Clock} required>
              <input
                type="number"
                min="0.25" step="0.25"
                value={form.hours_spent}
                onChange={(e) => setForm({ ...form, hours_spent: e.target.value })}
                placeholder="örn. 2.5"
                style={{
                  width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                  background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: 6, color: C.textPrimary, fontSize: 13, outline: 'none',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => e.target.style.borderColor = C.borderFocus}
                onBlur={(e) => e.target.style.borderColor = C.border}
              />
            </WorkloadField>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <WorkloadField label="Task description" icon={FileText} required>
              <textarea
                value={form.task_description}
                onChange={(e) => setForm({ ...form, task_description: e.target.value })}
                placeholder="Bugün ne üzerinde çalıştın? Detayları yaz..."
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                  background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: 6, color: C.textPrimary, fontSize: 13, outline: 'none',
                  fontFamily: 'inherit', resize: 'vertical', minHeight: 70,
                }}
                onFocus={(e) => e.target.style.borderColor = C.borderFocus}
                onBlur={(e) => e.target.style.borderColor = C.border}
              />
            </WorkloadField>
          </div>

          {/* Status & Complexity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <WorkloadField label="Status" icon={Activity}>
              <SegmentedControl
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
                options={STATUS_OPTIONS.map(o => ({ ...o, dot: true }))}
              />
            </WorkloadField>
            <WorkloadField label="Complexity">
              <SegmentedControl
                value={form.complexity}
                onChange={(v) => setForm({ ...form, complexity: v })}
                options={COMPLEXITY_OPTIONS}
              />
            </WorkloadField>
          </div>

          {/* Quantity */}
          <div style={{ marginBottom: 18 }}>
            <WorkloadField label="Quantity" icon={Hash} optional>
              <input
                type="number"
                min="0" step="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="örn. 5 (ticket, PR, test case sayısı)"
                style={{
                  width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                  background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: 6, color: C.textPrimary, fontSize: 13, outline: 'none',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => e.target.style.borderColor = C.borderFocus}
                onBlur={(e) => e.target.style.borderColor = C.border}
              />
            </WorkloadField>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end', paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
            <button
              onClick={resetForm}
              style={{
                padding: '10px 18px', background: 'transparent',
                border: `1px solid ${C.border}`, borderRadius: 6,
                color: C.textSecondary, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Temizle</button>
            <button
              onClick={handleSubmit}
              disabled={!isValid || dateLocked}
              style={{
                padding: '10px 22px',
                background: (isValid && !dateLocked) ? C.teal : `${C.teal}40`,
                border: 'none', borderRadius: 6,
                color: C.bg, fontSize: 13, fontWeight: 600,
                cursor: (isValid && !dateLocked) ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >
              {editingId ? <><Save size={14} /> Güncelle</> : <><Plus size={14} /> Workload ekle</>}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Daily summary */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
            <div style={{ fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              {date === today ? 'Bugünün özeti' : 'Seçili günün özeti'}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 32, fontWeight: 500, color: C.teal }}>{dayTotal.toFixed(1)}</span>
              <span style={{ fontSize: 14, color: C.textMuted }}>saat</span>
              <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 'auto' }}>{dayEntries.length} kayıt</span>
            </div>
            {/* Bar visualization */}
            <div style={{ height: 8, background: 'rgba(148, 163, 184, 0.08)', borderRadius: 4, overflow: 'hidden', display: 'flex', marginBottom: 8 }}>
              {dayEntries.map((e, i) => {
                const cat = findCategory(e.activity_type_id, e.category_id);
                const pct = dayTotal > 0 ? (e.hours_spent / dayTotal) * 100 : 0;
                return <div key={i} style={{ width: `${pct}%`, height: '100%', background: cat?.color || C.teal }} title={`${cat?.name}: ${e.hours_spent}h`} />;
              })}
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
              {dayTotal === 0 && 'Bu gün için kayıt yok'}
              {dayTotal > 0 && dayTotal < 8 && <><span style={{ color: C.amber }}>●</span> 8 saat hedefine {(8 - dayTotal).toFixed(1)} saat kaldı</>}
              {dayTotal >= 8 && dayTotal < 10 && <><span style={{ color: C.green }}>●</span> Günlük hedef tamam</>}
              {dayTotal >= 10 && <><span style={{ color: C.amber }}>●</span> Fazla mesai: {(dayTotal - 8).toFixed(1)} saat</>}
            </div>
          </div>

          {/* Day entries list */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.textPrimary }}>Bu günün girişlerin</div>
              <span style={{ fontSize: 11, color: C.textMuted }}>{dayEntries.length} kayıt</span>
            </div>
            {dayEntries.length === 0 ? (
              <div style={{
                padding: '32px 16px', textAlign: 'center',
                border: `1px dashed ${C.border}`, borderRadius: 6,
                fontSize: 12, color: C.textMuted, lineHeight: 1.6,
              }}>
                Bu gün için workload girişin yok.
                <br />
                Soldaki formdan ekle.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dayEntries.map((e) => (
                  <EntryRow
                    key={e.id}
                    entry={e}
                    findCategory={findCategory}
                    activityTypes={activityTypes}
                    projects={projects}
                    taskTypes={taskTypes}
                    isEditable={isEditable}
                    onDelete={(id) => setConfirmDelete(id)}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <ConfirmDialog
          title="Kaydı sil"
          message="Bu workload kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz."
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmDelete(null)}
          confirmLabel="Sil"
          danger
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          padding: '12px 18px',
          background: toast.type === 'error' ? C.red : C.surface,
          border: `1px solid ${toast.type === 'error' ? C.red : C.borderHover}`,
          borderRadius: 8, color: toast.type === 'error' ? '#fff' : C.textPrimary,
          fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {toast.type === 'error' ? <AlertCircle size={14} /> : <Check size={14} color={C.green} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
};

// ==================== LOOKUPS PAGE (Project / Category / Task Type CRUD) ====================
const COLOR_PALETTE = [
  '#2DD4BF', '#3B82F6', '#A78BFA', '#F59E0B', '#EC4899',
  '#10B981', '#EF4444', '#06B6D4', '#8B5CF6', '#F97316',
];

const LookupModal = ({ tab, item, isCreate, onClose, onSave, existingCodes }) => {
  const [form, setForm] = useState(item || {
    code: '', name: '', description: '', color: COLOR_PALETTE[0], is_active: true,
  });
  const [error, setError] = useState({});

  const validate = () => {
    const e = {};
    if (!form.code?.trim()) e.code = 'Code zorunludur';
    else if (!/^[A-Z0-9_-]+$/.test(form.code.trim())) e.code = 'Sadece büyük harf, rakam, _ ve -';
    else if (isCreate && existingCodes.includes(form.code.trim().toUpperCase())) e.code = 'Bu code zaten kullanılıyor';
    if (!form.name?.trim()) e.name = 'İsim zorunludur';
    setError(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      ...form,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description?.trim() || '',
    });
  };

  const isCategoryTab = ['projectCategories', 'nonProjCategories', 'selfImpCategories'].includes(tab);
  const isProjectTab = tab === 'projects';
  const isActivityTypeTab = tab === 'activityTypes';
  const tabLabel = {
    projects: 'Proje',
    activityTypes: 'Activity Type',
    projectCategories: 'Project Category',
    nonProjCategories: 'Non-Project Category',
    selfImpCategories: 'Self Imp Category',
    taskTypes: 'Task Type',
  }[tab];
  const codePlaceholder = isProjectTab ? 'ATLAS' : isCategoryTab ? 'FRONTEND' : isActivityTypeTab ? 'PROJECT' : 'DEV';
  const namePlaceholder = isProjectTab ? 'Atlas Platform' : isCategoryTab ? 'Frontend' : isActivityTypeTab ? 'Project Activity' : 'Development';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 10,
        width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: C.textPrimary }}>
              {isCreate ? `Yeni ${tabLabel}` : `${tabLabel} düzenle`}
            </div>
            {!isCreate && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, fontFamily: 'monospace' }}>{item.code}</div>}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 4, borderRadius: 4 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.textPrimary; e.currentTarget.style.background = C.surfaceHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; }}
          ><X size={16} /></button>
        </div>

        <div style={{ padding: 20 }}>
          <FormInput
            label="Code" required
            value={form.code}
            onChange={(v) => setForm({ ...form, code: v })}
            placeholder={codePlaceholder}
            readOnly={!isCreate}
            error={error.code}
          />
          <FormInput
            label="İsim" required
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            placeholder={namePlaceholder}
            error={error.name}
          />
          {(isProjectTab || isActivityTypeTab) && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Açıklama</label>
              <textarea
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Opsiyonel açıklama"
                style={{
                  width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                  background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6,
                  color: C.textPrimary, fontSize: 13, outline: 'none',
                  fontFamily: 'inherit', resize: 'vertical',
                }}
                onFocus={(e) => e.target.style.borderColor = C.borderFocus}
                onBlur={(e) => e.target.style.borderColor = C.border}
              />
            </div>
          )}
          {isCategoryTab && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Renk</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, color })}
                    style={{
                      width: 30, height: 30, borderRadius: 6,
                      background: color,
                      border: form.color === color ? `2px solid ${C.textPrimary}` : `2px solid transparent`,
                      cursor: 'pointer', padding: 0, transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title={color}
                  >
                    {form.color === color && <Check size={14} color="#0A1628" strokeWidth={3} />}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 10, padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.textSecondary }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: form.color }} />
                Önizleme: <span style={{ color: form.color, fontWeight: 500 }}>{form.name || 'Kategori adı'}</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', background: 'transparent',
              border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.textSecondary, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >İptal</button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px', background: C.teal, border: 'none', borderRadius: 6,
              color: C.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
            }}
          >
            {isCreate ? <><Plus size={13} /> Oluştur</> : <><Save size={13} /> Kaydet</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const LookupsPage = () => {
  const {
    activityTypes, setActivityTypes,
    projectCategories, setProjectCategories,
    nonProjCategories, setNonProjCategories,
    selfImpCategories, setSelfImpCategories,
    projects, setProjects, taskTypes, setTaskTypes, entries,
  } = useWorkload();
  const [tab, setTab] = useState('projects');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', item }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmReactivate, setConfirmReactivate] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // Custom usage counter — for activity-scoped categories, count entries that match BOTH activity_type and category_id
  const tabConfig = {
    projects: {
      label: 'Projeler', singular: 'Proje', icon: FolderOpen,
      data: projects, setter: setProjects, color: C.amber,
      countFn: (item) => entries.filter(e => e.project_id === item.id).length,
    },
    activityTypes: {
      label: 'Activity Types', singular: 'Activity Type', icon: Activity,
      data: activityTypes, setter: setActivityTypes, color: C.blue,
      countFn: (item) => entries.filter(e => e.activity_type_id === item.id).length,
    },
    projectCategories: {
      label: 'Project Categories', singular: 'Project Category', icon: Tag,
      data: projectCategories, setter: setProjectCategories, color: C.teal,
      countFn: (item) => entries.filter(e => e.activity_type_id === 1 && e.category_id === item.id).length,
    },
    nonProjCategories: {
      label: 'Non-Project Categories', singular: 'Non-Project Category', icon: Tag,
      data: nonProjCategories, setter: setNonProjCategories, color: C.amber,
      countFn: (item) => entries.filter(e => e.activity_type_id === 2 && e.category_id === item.id).length,
    },
    selfImpCategories: {
      label: 'Self Imp Categories', singular: 'Self Improvement Category', icon: Tag,
      data: selfImpCategories, setter: setSelfImpCategories, color: C.purple,
      countFn: (item) => entries.filter(e => e.activity_type_id === 3 && e.category_id === item.id).length,
    },
    taskTypes: {
      label: 'Task Types', singular: 'Task Type', icon: Layers,
      data: taskTypes, setter: setTaskTypes, color: C.green,
      countFn: (item) => entries.filter(e => e.task_type_id === item.id).length,
    },
  };

  const cfg = tabConfig[tab];
  const isCategoryTab = ['projectCategories', 'nonProjCategories', 'selfImpCategories'].includes(tab);
  const Icon = cfg.icon;

  // Filter
  const filteredItems = useMemo(() => {
    return cfg.data.filter((item) => {
      if (statusFilter === 'active' && !item.is_active) return false;
      if (statusFilter === 'inactive' && item.is_active) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q);
      }
      return true;
    });
  }, [cfg.data, search, statusFilter]);

  // Usage count: how many entries reference each item
  const getUsageCount = (itemId) => {
    const item = cfg.data.find(d => d.id === itemId);
    return item ? cfg.countFn(item) : 0;
  };

  const existingCodes = cfg.data.map(d => d.code.toUpperCase());

  const handleCreate = (data) => {
    const newItem = { ...data, id: Date.now() };
    cfg.setter([...cfg.data, newItem]);
    showToast(`"${newItem.name}" eklendi`);
    setModal(null);
  };

  const handleUpdate = (data) => {
    cfg.setter(cfg.data.map(d => d.id === data.id ? { ...d, ...data } : d));
    showToast('Değişiklikler kaydedildi');
    setModal(null);
  };

  const handleSoftDelete = () => {
    cfg.setter(cfg.data.map(d => d.id === confirmDelete.id ? { ...d, is_active: false } : d));
    showToast(`"${confirmDelete.name}" pasif duruma alındı`);
    setConfirmDelete(null);
  };

  const handleReactivate = () => {
    cfg.setter(cfg.data.map(d => d.id === confirmReactivate.id ? { ...d, is_active: true } : d));
    showToast(`"${confirmReactivate.name}" aktif duruma alındı`);
    setConfirmReactivate(null);
  };

  return (
    <div style={{ padding: 24, position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px', color: C.textPrimary }}>Yönetim</h1>
          <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>
            Workload girişlerinde kullanılan listeler
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: 'create', item: null })}
          style={{
            padding: '9px 16px', background: C.teal, border: 'none', borderRadius: 6,
            color: C.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
          }}
        >
          <Plus size={14} /> Yeni {cfg.singular}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${C.border}` }}>
        {Object.keys(tabConfig).map((key) => {
          const t = tabConfig[key];
          const TabIcon = t.icon;
          const active = tab === key;
          const activeCount = t.data.filter(d => d.is_active).length;
          return (
            <button
              key={key}
              onClick={() => { setTab(key); setSearch(''); }}
              style={{
                padding: '10px 16px',
                background: 'transparent', border: 'none',
                borderBottom: active ? `2px solid ${t.color}` : '2px solid transparent',
                color: active ? t.color : C.textSecondary,
                fontSize: 13, fontWeight: active ? 500 : 400,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: -1, fontFamily: 'inherit', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = C.textPrimary; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = C.textSecondary; }}
            >
              <TabIcon size={13} />
              {t.label}
              <span style={{
                fontSize: 10, padding: '1px 7px', borderRadius: 9,
                background: active ? `${t.color}1F` : C.surfaceDeep,
                color: active ? t.color : C.textMuted,
              }}>{activeCount}</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={14} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`${cfg.singular} ismi veya code'a göre ara...`}
            style={{
              width: '100%', padding: '8px 12px 8px 34px', boxSizing: 'border-box',
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.textPrimary, fontSize: 13, outline: 'none', fontFamily: 'inherit',
            }}
            onFocus={(e) => e.target.style.borderColor = C.borderFocus}
            onBlur={(e) => e.target.style.borderColor = C.border}
          />
        </div>
        <FilterDropdown
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Durum"
          options={[
            { value: 'active', label: 'Aktif', dotColor: C.green },
            { value: 'inactive', label: 'Pasif', dotColor: C.textMuted },
            { value: 'all', label: 'Tümü' },
          ]}
        />
      </div>

      {/* List */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        {filteredItems.length === 0 ? (
          <div style={{
            padding: '60px 20px', textAlign: 'center', color: C.textMuted, fontSize: 13,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${cfg.color}1F`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={22} color={cfg.color} />
            </div>
            <div>
              {search.trim() ? 'Arama sonucu bulunamadı' : `Henüz ${cfg.singular.toLowerCase()} yok`}
              <br />
              <span style={{ fontSize: 11, color: C.textMuted }}>
                {search.trim() ? 'Farklı bir terim deneyin' : `Sağ üstten yeni ${cfg.singular.toLowerCase()} ekleyebilirsiniz`}
              </span>
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.surfaceDeep, borderBottom: `1px solid ${C.border}` }}>
                {isCategoryTab && <th style={{ width: 50, padding: '10px 14px' }}></th>}
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, width: 120 }}>Code</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>İsim</th>
                {tab === 'projects' && <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Açıklama</th>}
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, width: 110 }}>Kullanım</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, width: 80 }}>Durum</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, width: 100 }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const usage = getUsageCount(item.id);
                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.12s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = C.surfaceHover}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {isCategoryTab && (
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ display: 'inline-block', width: 22, height: 22, borderRadius: 5, background: item.color, border: `1px solid ${C.border}` }} />
                      </td>
                    )}
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: C.textMuted, fontSize: 12 }}>{item.code}</td>
                    <td style={{ padding: '10px 14px', color: C.textPrimary, fontWeight: 500 }}>{item.name}</td>
                    {tab === 'projects' && (
                      <td style={{ padding: '10px 14px', color: C.textSecondary, fontSize: 12, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description || <span style={{ color: C.textMuted, fontStyle: 'italic' }}>—</span>}
                      </td>
                    )}
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {usage > 0 ? (
                        <span style={{ fontSize: 11, padding: '2px 8px', background: `${C.blue}1A`, color: C.blue, borderRadius: 3, fontWeight: 500 }}>
                          {usage} kayıt
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: C.textMuted, fontStyle: 'italic' }}>kullanılmadı</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        background: item.is_active ? C.green : C.textMuted,
                      }} title={item.is_active ? 'Aktif' : 'Pasif'} />
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        <button
                          onClick={() => setModal({ mode: 'edit', item })}
                          style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            padding: 6, borderRadius: 4, color: C.textMuted,
                          }}
                          title="Düzenle"
                          onMouseEnter={(e) => { e.currentTarget.style.color = C.teal; e.currentTarget.style.background = `${C.teal}1A`; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; }}
                        ><Edit2 size={13} /></button>
                        {item.is_active ? (
                          <button
                            onClick={() => setConfirmDelete(item)}
                            style={{
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              padding: 6, borderRadius: 4, color: C.textMuted,
                            }}
                            title="Pasif yap"
                            onMouseEnter={(e) => { e.currentTarget.style.color = C.red; e.currentTarget.style.background = `${C.red}1A`; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; }}
                          ><Power size={13} /></button>
                        ) : (
                          <button
                            onClick={() => setConfirmReactivate(item)}
                            style={{
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              padding: 6, borderRadius: 4, color: C.textMuted,
                            }}
                            title="Aktif yap"
                            onMouseEnter={(e) => { e.currentTarget.style.color = C.green; e.currentTarget.style.background = `${C.green}1A`; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; }}
                          ><Power size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <LookupModal
          tab={tab}
          item={modal.item}
          isCreate={modal.mode === 'create'}
          onClose={() => setModal(null)}
          onSave={modal.mode === 'create' ? handleCreate : handleUpdate}
          existingCodes={existingCodes}
        />
      )}

      {/* Confirm soft delete */}
      {confirmDelete && (
        <ConfirmDialog
          title={`${cfg.singular} pasif yap`}
          message={
            getUsageCount(confirmDelete.id) > 0
              ? `"${confirmDelete.name}" toplam ${getUsageCount(confirmDelete.id)} workload kaydında kullanılmış. Pasif yapıldığında listeden gizlenecek ama mevcut kayıtlar etkilenmeyecek. Daha sonra tekrar aktif yapabilirsin.`
              : `"${confirmDelete.name}" pasif duruma alınacak. Listeden gizlenecek ama veriler korunacak. Daha sonra tekrar aktif yapabilirsin.`
          }
          onConfirm={handleSoftDelete}
          onCancel={() => setConfirmDelete(null)}
          confirmLabel="Pasif yap"
          danger
        />
      )}

      {/* Confirm reactivate */}
      {confirmReactivate && (
        <ConfirmDialog
          title={`${cfg.singular} aktif yap`}
          message={`"${confirmReactivate.name}" tekrar aktif duruma alınacak ve workload girişlerinde seçilebilir hale gelecek.`}
          onConfirm={handleReactivate}
          onCancel={() => setConfirmReactivate(null)}
          confirmLabel="Aktif yap"
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          padding: '12px 18px',
          background: toast.type === 'error' ? C.red : C.surface,
          border: `1px solid ${toast.type === 'error' ? C.red : C.borderHover}`,
          borderRadius: 8, color: toast.type === 'error' ? '#fff' : C.textPrimary,
          fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {toast.type === 'error' ? <AlertCircle size={14} /> : <Check size={14} color={C.green} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
};

// ==================== WORKLOAD LIST PAGE ====================
const COMPLEXITY_COLOR = { low: '#10B981', medium: '#F59E0B', high: '#EF4444' };
const STATUS_COLOR = { ongoing: '#F59E0B', completed: '#10B981', blocked: '#EF4444' };

const MultiSelectFilter = ({ label, value, options, onChange, icon: Icon, displayKey = 'name', valueKey = 'id' }) => {
  const [open, setOpen] = useState(false);
  const selectedCount = value.length;
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '7px 10px 7px 12px', background: C.surface,
          border: `1px solid ${selectedCount > 0 ? C.borderHover : C.border}`,
          borderRadius: 6, fontSize: 12, color: C.textPrimary,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          fontFamily: 'inherit', minWidth: 130,
        }}
      >
        {Icon && <Icon size={12} color={C.textMuted} />}
        <span style={{ flex: 1, textAlign: 'left' }}>
          {label} {selectedCount > 0 && (
            <span style={{ marginLeft: 4, padding: '1px 6px', background: C.teal, color: C.bg, borderRadius: 8, fontSize: 10, fontWeight: 600 }}>{selectedCount}</span>
          )}
        </span>
        <ChevronDown size={12} color={C.textMuted} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0,
            background: C.surface, border: `1px solid ${C.borderHover}`,
            borderRadius: 6, zIndex: 40, overflow: 'hidden', maxHeight: 320, overflowY: 'auto',
            minWidth: 220, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            <div style={{ padding: '6px 10px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.surfaceDeep }}>
              <span style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
              {selectedCount > 0 && (
                <button
                  onClick={() => onChange([])}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 11, fontFamily: 'inherit', padding: 0 }}
                >Temizle</button>
              )}
            </div>
            {options.map((opt) => {
              const checked = value.includes(opt[valueKey]);
              return (
                <div
                  key={opt[valueKey]}
                  onClick={() => {
                    onChange(checked ? value.filter(v => v !== opt[valueKey]) : [...value, opt[valueKey]]);
                  }}
                  style={{
                    padding: '8px 12px', fontSize: 13, color: C.textPrimary, cursor: 'pointer',
                    background: checked ? `${C.teal}1A` : 'transparent',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = checked ? `${C.teal}1A` : C.surfaceHover}
                  onMouseLeave={(e) => e.currentTarget.style.background = checked ? `${C.teal}1A` : 'transparent'}
                >
                  <span style={{
                    width: 14, height: 14, borderRadius: 3,
                    border: `1.5px solid ${checked ? C.teal : C.textMuted}`,
                    background: checked ? C.teal : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {checked && <Check size={10} color={C.bg} strokeWidth={3} />}
                  </span>
                  {opt.dotColor && <span style={{ width: 8, height: 8, borderRadius: 2, background: opt.dotColor, flexShrink: 0 }} />}
                  <span style={{ flex: 1 }}>{opt[displayKey]}</span>
                  {opt.code && <span style={{ fontSize: 10, color: C.textMuted, fontFamily: 'monospace' }}>{opt.code}</span>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const WorkloadListPage = () => {
  const { currentUser, users, getUserRole, getUserTeam } = useAuth();
  const {
    activityTypes, projectCategories, nonProjCategories, selfImpCategories,
    findCategory, getCategoriesForActivity,
    projects, taskTypes, entries, updateEntry, deleteEntry, isEditable,
  } = useWorkload();

  const currentRole = getUserRole(currentUser);
  const isWorker = currentRole?.code === 'WORKER';

  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  })();

  // Filters
  const [dateFrom, setDateFrom] = useState(monthAgo);
  const [dateTo, setDateTo] = useState(today);
  const [filterUsers, setFilterUsers] = useState([]);
  const [filterTeams, setFilterTeams] = useState([]);
  const [filterProjects, setFilterProjects] = useState([]);
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterTaskTypes, setFilterTaskTypes] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterComplexity, setFilterComplexity] = useState([]);
  const [search, setSearch] = useState('');

  // Pagination
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  // Sorting
  const [sortKey, setSortKey] = useState('work_date');
  const [sortDir, setSortDir] = useState('desc');

  // Edit modal
  const [editEntry, setEditEntry] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // Toggle sort
  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      // Date range
      if (dateFrom && e.work_date < dateFrom) return false;
      if (dateTo && e.work_date > dateTo) return false;
      // User
      if (filterUsers.length > 0 && !filterUsers.includes(e.account_id)) return false;
      // Team (resolve through user)
      if (filterTeams.length > 0) {
        const u = users.find(x => x.account_id === e.account_id);
        if (!u || !filterTeams.includes(u.team_id)) return false;
      }
      // Project / Category / Task type
      if (filterProjects.length > 0 && !filterProjects.includes(e.project_id)) return false;
      if (filterCategories.length > 0 && !filterCategories.includes(e.category_id)) return false;
      if (filterTaskTypes.length > 0 && !filterTaskTypes.includes(e.task_type_id)) return false;
      // Status / Complexity
      if (filterStatus.length > 0 && !filterStatus.includes(e.status)) return false;
      if (filterComplexity.length > 0 && !filterComplexity.includes(e.complexity)) return false;
      // Search in description
      if (search.trim() && !e.task_description.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [entries, dateFrom, dateTo, filterUsers, filterTeams, filterProjects, filterCategories, filterTaskTypes, filterStatus, filterComplexity, search, users]);

  // Sorted
  const sortedEntries = useMemo(() => {
    const sorted = [...filteredEntries];
    sorted.sort((a, b) => {
      let va, vb;
      switch (sortKey) {
        case 'user': {
          const ua = users.find(u => u.account_id === a.account_id)?.name || '';
          const ub = users.find(u => u.account_id === b.account_id)?.name || '';
          va = ua; vb = ub; break;
        }
        case 'project': va = projects.find(p => p.id === a.project_id)?.name || ''; vb = projects.find(p => p.id === b.project_id)?.name || ''; break;
        case 'category': va = findCategory(a.activity_type_id, a.category_id)?.name || ''; vb = findCategory(b.activity_type_id, b.category_id)?.name || ''; break;
        case 'task_type': va = taskTypes.find(t => t.id === a.task_type_id)?.name || ''; vb = taskTypes.find(t => t.id === b.task_type_id)?.name || ''; break;
        case 'hours': va = a.hours_spent; vb = b.hours_spent; break;
        case 'work_date':
        default: va = a.work_date; vb = b.work_date;
      }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    // Secondary sort by id for stable order
    return sorted;
  }, [filteredEntries, sortKey, sortDir, users, projects, projectCategories, nonProjCategories, selfImpCategories, taskTypes]);

  // Stats
  const stats = useMemo(() => {
    const totalHours = filteredEntries.reduce((s, e) => s + parseFloat(e.hours_spent || 0), 0);
    const uniqueUsers = new Set(filteredEntries.map(e => e.account_id)).size;
    const uniqueDays = new Set(filteredEntries.map(e => e.work_date)).size;
    const avgHoursPerDay = uniqueDays > 0 ? totalHours / uniqueDays : 0;
    return {
      totalHours: totalHours.toFixed(1),
      totalEntries: filteredEntries.length,
      uniqueUsers,
      avgHoursPerDay: avgHoursPerDay.toFixed(1),
    };
  }, [filteredEntries]);

  // Chart data computations
  const trendData = useMemo(() => {
    // Group by date, sum hours
    const map = {};
    filteredEntries.forEach(e => {
      map[e.work_date] = (map[e.work_date] || 0) + parseFloat(e.hours_spent || 0);
    });
    // Build a continuous date range from dateFrom to dateTo
    const result = [];
    if (!dateFrom || !dateTo) return result;
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    if (end < start) return result;
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      result.push({
        date: key,
        label: cursor.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
        hours: parseFloat((map[key] || 0).toFixed(1)),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [filteredEntries, dateFrom, dateTo]);

  const projectChartData = useMemo(() => {
    const map = {};
    filteredEntries.forEach(e => {
      map[e.project_id] = (map[e.project_id] || 0) + parseFloat(e.hours_spent || 0);
    });
    const palette = [C.teal, C.blue, C.purple, C.amber, C.pink, C.green, C.red, '#06B6D4'];
    return Object.entries(map)
      .map(([pid, hours], i) => {
        const proj = projects.find(p => p.id === parseInt(pid));
        return { name: proj?.name || `Project ${pid}`, hours: parseFloat(hours.toFixed(1)), color: palette[i % palette.length] };
      })
      .sort((a, b) => b.hours - a.hours);
  }, [filteredEntries, projects]);

  const activityChartData = useMemo(() => {
    // Color per activity type id
    const colorMap = { 1: C.teal, 2: C.amber, 3: C.purple };
    const map = {};
    filteredEntries.forEach(e => {
      const aid = e.activity_type_id;
      if (!aid) return;
      if (!map[aid]) {
        const a = activityTypes.find(x => x.id === aid);
        map[aid] = { id: aid, name: a?.name || `Activity ${aid}`, color: colorMap[aid] || C.blue, hours: 0 };
      }
      map[aid].hours += parseFloat(e.hours_spent || 0);
    });
    return Object.values(map)
      .map(v => ({ ...v, hours: parseFloat(v.hours.toFixed(1)) }))
      .sort((a, b) => b.hours - a.hours);
  }, [filteredEntries, activityTypes]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedEntries = sortedEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Active filter count
  const activeFilterCount = filterUsers.length + filterTeams.length + filterProjects.length + filterCategories.length + filterTaskTypes.length + filterStatus.length + filterComplexity.length + (search.trim() ? 1 : 0);

  const clearAllFilters = () => {
    setFilterUsers([]); setFilterTeams([]); setFilterProjects([]); setFilterCategories([]);
    setFilterTaskTypes([]); setFilterStatus([]); setFilterComplexity([]); setSearch('');
    setDateFrom(monthAgo); setDateTo(today);
    setPage(1);
  };

  const handleExport = () => {
    const teamMap = { 1: 'Engineering', 2: 'Product', 3: 'Design', 4: 'QA', 5: 'DevOps', 6: 'Marketing' };
    const headers = ['Tarih', 'Kullanıcı', 'Takım', 'Activity Type', 'Proje', 'Kategori', 'Task Type', 'Açıklama', 'Status', 'Complexity', 'Quantity', 'Saat'];
    const rows = sortedEntries.map(e => {
      const u = users.find(x => x.account_id === e.account_id);
      const teamName = u ? (teamMap[u.team_id] || '') : '';
      const activity = activityTypes.find(a => a.id === e.activity_type_id)?.name || '';
      const cat = findCategory(e.activity_type_id, e.category_id)?.name || '';
      const proj = e.project_id ? (projects.find(p => p.id === e.project_id)?.name || '') : '';
      const tt = taskTypes.find(x => x.id === e.task_type_id)?.name || '';
      return [e.work_date, u?.name || e.account_id, teamName, activity, proj, cat, tt, e.task_description, e.status, e.complexity, e.quantity ?? '', e.hours_spent];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workload-export-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${sortedEntries.length} kayıt CSV olarak indirildi`);
  };

  const handleDeleteConfirmed = () => {
    deleteEntry(confirmDeleteId);
    if (editEntry?.id === confirmDeleteId) setEditEntry(null);
    setConfirmDeleteId(null);
    showToast('Kayıt silindi');
  };

  const handleSaveEdit = (updated) => {
    updateEntry(editEntry.id, updated);
    setEditEntry(null);
    showToast('Kayıt güncellendi');
  };

  // Sortable header helper
  const SortHeader = ({ label, sortKey: k, align = 'left', width }) => {
    const active = sortKey === k;
    return (
      <th
        onClick={() => toggleSort(k)}
        style={{
          padding: '10px 14px', textAlign: align, fontSize: 11,
          color: active ? C.teal : C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5,
          fontWeight: 500, cursor: 'pointer', userSelect: 'none', width,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {label}
          {active && <span style={{ fontSize: 10 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
        </span>
      </th>
    );
  };

  return (
    <div style={{ padding: 24, position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px', color: C.textPrimary }}>Workload listesi</h1>
          <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>
            {isWorker ? 'Şirket geneli kayıtlar — read-only' : 'Tüm kayıtları filtrele ve düzenle'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={clearAllFilters}
            style={{
              padding: '8px 14px',
              background: activeFilterCount > 0 ? `${C.amber}1A` : 'transparent',
              border: `1px solid ${activeFilterCount > 0 ? C.amber + '40' : C.border}`,
              borderRadius: 6,
              color: activeFilterCount > 0 ? C.amber : C.textSecondary,
              fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { if (activeFilterCount === 0) { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.color = C.textPrimary; } }}
            onMouseLeave={(e) => { if (activeFilterCount === 0) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; } }}
          >
            <X size={12} /> Filtreleri temizle
            {activeFilterCount > 0 && (
              <span style={{
                marginLeft: 2, padding: '1px 7px', background: C.amber, color: C.bg,
                borderRadius: 9, fontSize: 10, fontWeight: 700, lineHeight: 1.4,
              }}>{activeFilterCount}</span>
            )}
          </button>
          <button
            onClick={handleExport}
            disabled={sortedEntries.length === 0}
            style={{
              padding: '8px 14px',
              background: sortedEntries.length > 0 ? C.teal : `${C.teal}40`,
              border: 'none', borderRadius: 6,
              color: C.bg, fontSize: 12, fontWeight: 600,
              cursor: sortedEntries.length > 0 ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
            }}
          >
            <Save size={12} /> CSV indir ({sortedEntries.length})
          </button>
        </div>
      </div>

      {/* Filter bar — at top, drives KPIs / charts / table */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
        {/* Date range + search */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <Calendar size={11} /> Tarih aralığı:
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              padding: '7px 10px', background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: 6, color: C.textPrimary, fontSize: 12, outline: 'none',
              fontFamily: 'inherit', colorScheme: 'dark',
            }}
          />
          <span style={{ color: C.textMuted, fontSize: 12 }}>—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              padding: '7px 10px', background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: 6, color: C.textPrimary, fontSize: 12, outline: 'none',
              fontFamily: 'inherit', colorScheme: 'dark',
            }}
          />
          <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
            {[
              { label: 'Bugün', from: today, to: today },
              { label: 'Son 7 gün', from: (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0,10); })(), to: today },
              { label: 'Son 30 gün', from: monthAgo, to: today },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => { setDateFrom(preset.from); setDateTo(preset.to); }}
                style={{
                  padding: '5px 9px', background: 'transparent',
                  border: `1px solid ${C.border}`, borderRadius: 4,
                  color: C.textMuted, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.textPrimary; e.currentTarget.style.borderColor = C.borderHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = C.border; }}
              >{preset.label}</button>
            ))}
          </div>
          <div style={{ position: 'relative', flex: 1, minWidth: 200, marginLeft: 'auto' }}>
            <Search size={13} color={C.textMuted} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Açıklamada ara..."
              style={{
                width: '100%', padding: '7px 10px 7px 32px', boxSizing: 'border-box',
                background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6,
                color: C.textPrimary, fontSize: 12, outline: 'none', fontFamily: 'inherit',
              }}
              onFocus={(e) => e.target.style.borderColor = C.borderFocus}
              onBlur={(e) => e.target.style.borderColor = C.border}
            />
          </div>
        </div>

        {/* Filter dropdowns */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <MultiSelectFilter
            label="Kullanıcı" icon={Users}
            value={filterUsers}
            onChange={setFilterUsers}
            options={users.filter(u => u.is_active).map(u => ({ id: u.account_id, name: u.name, code: u.account_id }))}
            displayKey="name" valueKey="id"
          />
          <MultiSelectFilter
            label="Takım"
            value={filterTeams}
            onChange={setFilterTeams}
            options={[1,2,3,4,5,6].map(id => {
              const teamMap = { 1: 'Engineering', 2: 'Product', 3: 'Design', 4: 'QA', 5: 'DevOps', 6: 'Marketing' };
              return { id, name: teamMap[id], dotColor: TEAM_COLORS[teamMap[id]] };
            })}
          />
          <MultiSelectFilter
            label="Proje" icon={FolderOpen}
            value={filterProjects}
            onChange={setFilterProjects}
            options={projects.filter(p => p.is_active).map(p => ({ ...p, code: p.code }))}
          />
          {/* Kategori filtresi geçici olarak kaldırıldı — kategoriler 3 ayrı listeye bölündü.
              Bunun yerine ileride Activity Type filtresi eklenecek. */}
          <MultiSelectFilter
            label="Task type" icon={Layers}
            value={filterTaskTypes}
            onChange={setFilterTaskTypes}
            options={taskTypes.filter(t => t.is_active)}
          />
          <MultiSelectFilter
            label="Status" icon={Activity}
            value={filterStatus}
            onChange={setFilterStatus}
            options={STATUS_OPTIONS.map(s => ({ id: s.value, name: s.label, dotColor: s.color }))}
            displayKey="name" valueKey="id"
          />
          <MultiSelectFilter
            label="Complexity"
            value={filterComplexity}
            onChange={setFilterComplexity}
            options={COMPLEXITY_OPTIONS.map(c => ({ id: c.value, name: c.label, dotColor: c.color }))}
            displayKey="name" valueKey="id"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Toplam saat', value: stats.totalHours, suffix: 'h', accent: C.teal, icon: Clock },
          { label: 'Toplam kayıt', value: stats.totalEntries, accent: C.blue, icon: ClipboardList },
          { label: 'Kullanıcı sayısı', value: stats.uniqueUsers, accent: C.purple, icon: Users },
          { label: 'Ort. saat / gün', value: stats.avgHoursPerDay, suffix: 'h', accent: C.amber, icon: Activity },
        ].map((kpi) => {
          const KIcon = kpi.icon;
          return (
            <div key={kpi.label} style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
              padding: 14, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: kpi.accent }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>{kpi.label}</span>
                <div style={{ width: 24, height: 24, borderRadius: 5, background: `${kpi.accent}1F`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KIcon size={12} color={kpi.accent} />
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 500, color: C.textPrimary }}>
                {kpi.value}
                {kpi.suffix && <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 400, marginLeft: 4 }}>{kpi.suffix}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts grid */}
      {filteredEntries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
          {/* Trend chart - full width */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={14} color={C.teal} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.textPrimary }}>Günlük workload trendi</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>Toplam saat / gün — filtrelenmiş aralıkta</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'monospace' }}>{trendData.length} gün</div>
            </div>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <AreaChart data={trendData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.teal} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={C.teal} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                  <XAxis dataKey="label" stroke={C.textMuted} fontSize={10} tick={{ fill: C.textMuted }} />
                  <YAxis stroke={C.textMuted} fontSize={10} tick={{ fill: C.textMuted }} />
                  <Tooltip
                    contentStyle={{
                      background: C.bg, border: `1px solid ${C.borderHover}`,
                      borderRadius: 6, fontSize: 12, padding: '6px 10px',
                    }}
                    labelStyle={{ color: C.textPrimary, fontWeight: 500, marginBottom: 2 }}
                    itemStyle={{ color: C.teal }}
                    formatter={(value) => [`${value} saat`, 'Toplam']}
                  />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke={C.teal}
                    strokeWidth={2}
                    fill="url(#trendGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: C.teal, stroke: C.bg, strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom row: Project + Category side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Project chart - hours by project */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <PieChartIcon size={14} color={C.amber} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.textPrimary }}>Projeye göre çalışma saatleri</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>Her projeye harcanan toplam saat</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 160, height: 160, position: 'relative', flexShrink: 0 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={projectChartData}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={75}
                        paddingAngle={2}
                        dataKey="hours"
                      >
                        {projectChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: C.bg, border: `1px solid ${C.borderHover}`,
                          borderRadius: 6, fontSize: 12, padding: '6px 10px',
                        }}
                        formatter={(value, name) => [`${value} saat`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                    <div style={{ fontSize: 18, fontWeight: 500, color: C.textPrimary, lineHeight: 1 }}>
                      {projectChartData.reduce((s, x) => s + x.hours, 0).toFixed(0)}
                    </div>
                    <div style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>toplam saat</div>
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
                  {projectChartData.map((p) => {
                    const total = projectChartData.reduce((s, x) => s + x.hours, 0);
                    const pct = total > 0 ? Math.round((p.hours / total) * 100) : 0;
                    return (
                      <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                        <span style={{ color: C.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        <span style={{ color: p.color, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{p.hours}h</span>
                        <span style={{ color: C.textMuted, fontVariantNumeric: 'tabular-nums', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Activity type chart */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Activity size={14} color={C.pink} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.textPrimary }}>Activity'e göre çalışma dağılımı</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>Project / Non-Project / Self Improvement</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {activityChartData.length === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 12, color: C.textMuted }}>Veri yok</div>
                ) : activityChartData.map((a) => {
                  const maxH = Math.max(...activityChartData.map(x => x.hours));
                  const total = activityChartData.reduce((s, x) => s + x.hours, 0);
                  const pct = total > 0 ? Math.round((a.hours / total) * 100) : 0;
                  return (
                    <div key={a.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                        <span style={{ color: C.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: a.color }} />
                          {a.name}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: a.color, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{a.hours}h</span>
                          <span style={{ color: C.textMuted, fontSize: 10, fontVariantNumeric: 'tabular-nums', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                        </span>
                      </div>
                      <div style={{ height: 10, background: 'rgba(148, 163, 184, 0.08)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          width: `${maxH > 0 ? (a.hours / maxH) * 100 : 0}%`,
                          height: '100%', background: a.color,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results table */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1100 }}>
            <thead>
              <tr style={{ background: C.surfaceDeep, borderBottom: `1px solid ${C.border}` }}>
                <SortHeader label="Tarih" sortKey="work_date" width={100} />
                <SortHeader label="Kullanıcı" sortKey="user" width={170} />
                <SortHeader label="Proje" sortKey="project" width={140} />
                <SortHeader label="Kategori" sortKey="category" width={110} />
                <SortHeader label="Task type" sortKey="task_type" width={110} />
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>Açıklama</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, width: 90 }}>Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, width: 100 }}>Complexity</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, width: 70 }}>Qty</th>
                <SortHeader label="Saat" sortKey="hours" align="right" width={70} />
                {!isWorker && <th style={{ width: 80, padding: '10px 14px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {pagedEntries.length === 0 ? (
                <tr>
                  <td colSpan={isWorker ? 10 : 11} style={{ padding: '60px 20px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
                    {activeFilterCount > 0 ? 'Filtreyle eşleşen kayıt bulunamadı' : 'Henüz kayıt yok'}
                  </td>
                </tr>
              ) : pagedEntries.map((e) => {
                const user = users.find(u => u.account_id === e.account_id);
                const cat = findCategory(e.activity_type_id, e.category_id);
                const proj = e.project_id ? projects.find(p => p.id === e.project_id) : null;
                const activity = activityTypes.find(a => a.id === e.activity_type_id);
                const tt = taskTypes.find(t => t.id === e.task_type_id);
                const editable = !isWorker && isEditable(e.work_date);
                return (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.12s' }}
                    onMouseEnter={(ev) => ev.currentTarget.style.background = C.surfaceHover}
                    onMouseLeave={(ev) => ev.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 14px', color: C.textSecondary, fontSize: 12, fontFamily: 'monospace' }}>{e.work_date}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={user.name} size={22} />
                          <span style={{ color: C.textPrimary, fontSize: 12 }}>{user.name}</span>
                        </div>
                      ) : (
                        <span style={{ color: C.textMuted, fontSize: 11 }}>{e.account_id}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', color: C.textPrimary, fontSize: 12, fontWeight: 500 }}>
                      {proj ? proj.name : <span style={{ color: C.textMuted, fontStyle: 'italic' }}>{activity?.name || '—'}</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {cat && <Badge color={cat.color}>{cat.name}</Badge>}
                    </td>
                    <td style={{ padding: '10px 14px', color: C.textSecondary, fontSize: 12 }}>{tt?.name}</td>
                    <td style={{ padding: '10px 14px', color: C.textSecondary, fontSize: 12, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.task_description}>
                      {e.task_description}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 3,
                        background: `${STATUS_COLOR[e.status]}1A`, color: STATUS_COLOR[e.status],
                        fontWeight: 500,
                      }}>{e.status === 'completed' ? 'Tamam' : e.status === 'blocked' ? 'Blok' : 'Devam'}</span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 3,
                        background: `${COMPLEXITY_COLOR[e.complexity]}1A`, color: COMPLEXITY_COLOR[e.complexity],
                        textTransform: 'capitalize', fontWeight: 500,
                      }}>{e.complexity}</span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: C.textSecondary, fontSize: 12 }}>
                      {e.quantity ?? <span style={{ color: C.textMuted }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: C.teal, fontWeight: 500, fontSize: 13 }}>{e.hours_spent}h</td>
                    {!isWorker && (
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        {editable ? (
                          <div style={{ display: 'inline-flex', gap: 2 }}>
                            <button
                              onClick={() => setEditEntry(e)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 4, color: C.textMuted }}
                              onMouseEnter={(ev) => { ev.currentTarget.style.color = C.teal; ev.currentTarget.style.background = `${C.teal}1A`; }}
                              onMouseLeave={(ev) => { ev.currentTarget.style.color = C.textMuted; ev.currentTarget.style.background = 'transparent'; }}
                              title="Düzenle"
                            ><Edit2 size={13} /></button>
                            <button
                              onClick={() => setConfirmDeleteId(e.id)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 4, color: C.textMuted }}
                              onMouseEnter={(ev) => { ev.currentTarget.style.color = C.red; ev.currentTarget.style.background = `${C.red}1A`; }}
                              onMouseLeave={(ev) => { ev.currentTarget.style.color = C.textMuted; ev.currentTarget.style.background = 'transparent'; }}
                              title="Sil"
                            ><Trash2 size={13} /></button>
                          </div>
                        ) : (
                          <span title="30 günden eski kayıt - düzenlenemez" style={{ padding: 6, color: C.textMuted, display: 'inline-flex' }}>
                            <LockIcon size={13} />
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {sortedEntries.length > 0 && (
          <div style={{
            padding: '10px 16px', borderTop: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: C.surfaceDeep, gap: 12, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: C.textSecondary }}>
              <span>Sayfa boyutu:</span>
              <div style={{ display: 'flex', gap: 2, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, padding: 2 }}>
                {[20, 50, 100].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setPageSize(s); setPage(1); }}
                    style={{
                      padding: '4px 10px', fontSize: 11,
                      background: pageSize === s ? C.teal : 'transparent',
                      color: pageSize === s ? C.bg : C.textSecondary,
                      border: 'none', borderRadius: 3, cursor: 'pointer',
                      fontWeight: pageSize === s ? 600 : 400, fontFamily: 'inherit',
                    }}
                  >{s}</button>
                ))}
              </div>
              <span>·</span>
              <span>
                {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, sortedEntries.length)} / {sortedEntries.length}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '6px 10px', background: 'transparent',
                  border: `1px solid ${C.border}`, borderRadius: 5,
                  color: currentPage === 1 ? C.textMuted : C.textPrimary,
                  fontSize: 11, cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1, fontFamily: 'inherit',
                }}
              >‹ Önceki</button>
              <span style={{ fontSize: 12, color: C.textSecondary, padding: '0 8px' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '6px 10px', background: 'transparent',
                  border: `1px solid ${C.border}`, borderRadius: 5,
                  color: currentPage === totalPages ? C.textMuted : C.textPrimary,
                  fontSize: 11, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1, fontFamily: 'inherit',
                }}
              >Sonraki ›</button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editEntry && (
        <EntryEditModal
          entry={editEntry}
          activityTypes={activityTypes}
          getCategoriesForActivity={getCategoriesForActivity}
          projects={projects.filter(p => p.is_active)}
          taskTypes={taskTypes.filter(t => t.is_active)}
          onClose={() => setEditEntry(null)}
          onSave={handleSaveEdit}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Kaydı sil"
          message="Bu workload kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz."
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmDeleteId(null)}
          confirmLabel="Sil"
          danger
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          padding: '12px 18px',
          background: toast.type === 'error' ? C.red : C.surface,
          border: `1px solid ${toast.type === 'error' ? C.red : C.borderHover}`,
          borderRadius: 8, color: toast.type === 'error' ? '#fff' : C.textPrimary,
          fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {toast.type === 'error' ? <AlertCircle size={14} /> : <Check size={14} color={C.green} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
};

const EntryEditModal = ({ entry, activityTypes, getCategoriesForActivity, projects, taskTypes, onClose, onSave }) => {
  const [form, setForm] = useState({
    activity_type_id: entry.activity_type_id || 1,
    category_id: entry.category_id,
    project_id: entry.project_id,
    task_type_id: entry.task_type_id,
    task_description: entry.task_description,
    status: entry.status,
    complexity: entry.complexity,
    quantity: entry.quantity == null ? '' : String(entry.quantity),
    hours_spent: String(entry.hours_spent),
  });

  const isProjectActivity = form.activity_type_id === 1;
  const isValid = form.activity_type_id && form.category_id && form.task_type_id &&
    (isProjectActivity ? form.project_id : true) &&
    form.task_description.trim() && form.hours_spent && parseFloat(form.hours_spent) > 0;

  const handleActivityChange = (newId) => {
    setForm({ ...form, activity_type_id: newId, category_id: null, project_id: null });
  };

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      activity_type_id: form.activity_type_id,
      category_id: form.category_id,
      project_id: isProjectActivity ? form.project_id : null,
      task_type_id: form.task_type_id,
      task_description: form.task_description.trim(),
      status: form.status,
      complexity: form.complexity,
      quantity: form.quantity === '' ? null : parseInt(form.quantity),
      hours_spent: parseFloat(form.hours_spent),
    });
  };

  const activeCats = form.activity_type_id ? getCategoriesForActivity(form.activity_type_id).filter(c => c.is_active) : [];
  const activeActivityTypes = activityTypes.filter(a => a.is_active);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 10,
        width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: C.textPrimary }}>Kaydı düzenle</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{entry.work_date} · ID #{entry.id}</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 4, borderRadius: 4 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.textPrimary; e.currentTarget.style.background = C.surfaceHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; }}
          ><X size={16} /></button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto' }}>
          {/* Activity type segmented */}
          <div style={{ marginBottom: 14 }}>
            <WorkloadField label="Activity type" required>
              <SegmentedControl
                value={form.activity_type_id}
                onChange={handleActivityChange}
                options={activeActivityTypes.map((a) => {
                  const colorMap = { 1: C.teal, 2: C.amber, 3: C.purple };
                  return { value: a.id, label: a.name, color: colorMap[a.id] || C.blue, dot: true };
                })}
              />
            </WorkloadField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <WorkloadField label="Kategori" required>
              <WorkloadSelect
                value={form.category_id}
                options={activeCats}
                onChange={(v) => setForm({ ...form, category_id: v })}
                placeholder="Seç..."
                renderItem={(c) => (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
                    {c.name}
                  </span>
                )}
              />
            </WorkloadField>
            {isProjectActivity ? (
              <WorkloadField label="Proje" required>
                <WorkloadSelect
                  value={form.project_id}
                  options={projects}
                  onChange={(v) => setForm({ ...form, project_id: v })}
                  placeholder="Seç..."
                />
              </WorkloadField>
            ) : (
              <div />
            )}
            <WorkloadField label="Task type" required>
              <WorkloadSelect
                value={form.task_type_id}
                options={taskTypes}
                onChange={(v) => setForm({ ...form, task_type_id: v })}
                placeholder="Seç..."
              />
            </WorkloadField>
            <WorkloadField label="Hours" required>
              <input
                type="number" min="0.25" step="0.25"
                value={form.hours_spent}
                onChange={(e) => setForm({ ...form, hours_spent: e.target.value })}
                style={{
                  width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                  background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: 6, color: C.textPrimary, fontSize: 13, outline: 'none', fontFamily: 'inherit',
                }}
                onFocus={(e) => e.target.style.borderColor = C.borderFocus}
                onBlur={(e) => e.target.style.borderColor = C.border}
              />
            </WorkloadField>
          </div>

          <div style={{ marginBottom: 12 }}>
            <WorkloadField label="Açıklama" required>
              <textarea
                value={form.task_description}
                onChange={(e) => setForm({ ...form, task_description: e.target.value })}
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                  background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6,
                  color: C.textPrimary, fontSize: 13, outline: 'none',
                  fontFamily: 'inherit', resize: 'vertical',
                }}
                onFocus={(e) => e.target.style.borderColor = C.borderFocus}
                onBlur={(e) => e.target.style.borderColor = C.border}
              />
            </WorkloadField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <WorkloadField label="Status">
              <SegmentedControl
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
                options={STATUS_OPTIONS.map(o => ({ ...o, dot: true }))}
              />
            </WorkloadField>
            <WorkloadField label="Complexity">
              <SegmentedControl
                value={form.complexity}
                onChange={(v) => setForm({ ...form, complexity: v })}
                options={COMPLEXITY_OPTIONS}
              />
            </WorkloadField>
          </div>

          <WorkloadField label="Quantity" optional>
            <input
              type="number" min="0" step="1"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              style={{
                width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: 6, color: C.textPrimary, fontSize: 13, outline: 'none', fontFamily: 'inherit',
              }}
              onFocus={(e) => e.target.style.borderColor = C.borderFocus}
              onBlur={(e) => e.target.style.borderColor = C.border}
            />
          </WorkloadField>
        </div>

        <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', background: 'transparent',
              border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.textSecondary, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >İptal</button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            style={{
              padding: '8px 16px',
              background: isValid ? C.teal : `${C.teal}40`,
              border: 'none', borderRadius: 6,
              color: C.bg, fontSize: 13, fontWeight: 600,
              cursor: isValid ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
            }}
          >
            <Save size={13} /> Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== YEARLY REPORT PAGE ====================
const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const TR_MONTHS_FULL = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// Returns color category for a cell based on hours vs target
// Target = workingDays * 8
// >100% green, =100% none, 50%-99% yellow, <50% red
const getCellTone = (hours, workingDays) => {
  const target = workingDays * 8;
  if (target === 0) return 'none';
  if (hours === 0) return 'red'; // no entries → very low
  const ratio = hours / target;
  if (ratio > 1) return 'green';
  if (ratio === 1) return 'none';
  if (ratio >= 0.5) return 'yellow';
  return 'red';
};

const TONE_STYLES = {
  green: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' },
  yellow: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
  red: { bg: 'rgba(239, 68, 68, 0.18)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.35)' },
  none: { bg: 'transparent', text: '#CBD5E1', border: 'transparent' },
  empty: { bg: 'transparent', text: '#475569', border: 'transparent' },
};

const ExpectedDaysEditor = ({ year, expectedDays, canEdit, onSave, onClose }) => {
  const [values, setValues] = useState([...expectedDays]);

  const handleSave = () => {
    onSave(values);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.borderHover}`, borderRadius: 10,
        width: '100%', maxWidth: 540, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: C.textPrimary }}>{year} working days</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
              Her ay için beklenen çalışma günü sayısı (resmi tatiller hariç)
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 4, borderRadius: 4 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.textPrimary; e.currentTarget.style.background = C.surfaceHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'transparent'; }}
          ><X size={16} /></button>
        </div>

        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {TR_MONTHS_FULL.map((m, i) => (
            <div key={m}>
              <label style={{ display: 'block', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>{m}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  min="0" max="31" step="1"
                  value={values[i]}
                  onChange={(e) => {
                    const newArr = [...values];
                    newArr[i] = parseInt(e.target.value) || 0;
                    setValues(newArr);
                  }}
                  disabled={!canEdit}
                  style={{
                    width: '100%', padding: '8px 10px', boxSizing: 'border-box',
                    background: canEdit ? C.bg : C.surfaceDeep,
                    border: `1px solid ${C.border}`, borderRadius: 6,
                    color: canEdit ? C.textPrimary : C.textMuted, fontSize: 13, outline: 'none',
                    fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums',
                  }}
                  onFocus={(e) => { if (canEdit) e.target.style.borderColor = C.borderFocus; }}
                  onBlur={(e) => e.target.style.borderColor = C.border}
                />
                <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: 'nowrap' }}>gün</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: C.textMuted }}>
            Toplam: <span style={{ color: C.textPrimary, fontWeight: 500 }}>{values.reduce((s, v) => s + v, 0)}</span> gün ·
            Hedef: <span style={{ color: C.teal, fontWeight: 500 }}>{values.reduce((s, v) => s + v, 0) * 8}</span> saat / kişi
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px', background: 'transparent',
                border: `1px solid ${C.border}`, borderRadius: 6,
                color: C.textSecondary, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >{canEdit ? 'İptal' : 'Kapat'}</button>
            {canEdit && (
              <button
                onClick={handleSave}
                style={{
                  padding: '8px 16px', background: C.teal, border: 'none', borderRadius: 6,
                  color: C.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                }}
              >
                <Save size={13} /> Kaydet
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const YearlyReportPage = () => {
  const { currentUser, users, getUserRole, teams } = useAuth();
  const { entries, activityTypes, projects, expectedWorkingDays, getExpectedDays, setExpectedDays } = useWorkload();
  const currentRole = getUserRole(currentUser);
  const canEditExpected = ['ADMIN', 'MANAGER', 'TECH_LEAD', 'QA_SPECIALIST'].includes(currentRole?.code);

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [filterTeam, setFilterTeam] = useState(null);
  const [filterProject, setFilterProject] = useState(null);
  const [search, setSearch] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [toast, setToast] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleExpand = (accountId) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  };
  const toggleAll = () => {
    if (expandedRows.size === userRows.length) {
      setExpandedRows(new Set());
    } else {
      setExpandedRows(new Set(userRows.map(r => r.user.account_id)));
    }
  };

  // Coloring is disabled when the selected project is Non-Project Activity or Self Improvement
  // (those should be ~10% of the total, comparing to the full target is misleading)
  const selectedProject = filterProject ? projects.find(p => p.id === filterProject) : null;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // Available years (from existing data + current)
  const availableYears = useMemo(() => {
    const set = new Set();
    set.add(currentYear);
    Object.keys(expectedWorkingDays).forEach(y => set.add(parseInt(y)));
    entries.forEach(e => set.add(parseInt(e.work_date.slice(0, 4))));
    return Array.from(set).sort((a, b) => b - a);
  }, [entries, expectedWorkingDays, currentYear]);

  const yearExpected = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => getExpectedDays(year, i));
  }, [year, expectedWorkingDays]);

  // Build matrix: { account_id: { hoursByMonth: number[12], total: number } }
  const userRows = useMemo(() => {
    // Filter active users
    const activeUsers = users.filter(u => u.is_active);
    let rows = activeUsers.map(u => {
      const team = teams.find(t => t.id === u.team_id);
      const hoursByMonth = Array(12).fill(0);
      // Per-activity-type breakdown: { [activityTypeId]: number[12] }
      const breakdownByActivity = {};
      activityTypes.forEach(a => { breakdownByActivity[a.id] = Array(12).fill(0); });

      entries.forEach(e => {
        if (e.account_id !== u.account_id) return;
        if (filterProject && e.project_id !== filterProject) return;
        const d = new Date(e.work_date);
        if (d.getFullYear() !== year) return;
        const m = d.getMonth();
        const hours = parseFloat(e.hours_spent || 0);
        hoursByMonth[m] += hours;
        if (e.activity_type_id && breakdownByActivity[e.activity_type_id]) {
          breakdownByActivity[e.activity_type_id][m] += hours;
        }
      });
      const total = hoursByMonth.reduce((s, h) => s + h, 0);
      return { user: u, team, hoursByMonth, breakdownByActivity, total };
    });

    if (filterTeam) {
      rows = rows.filter(r => r.user.team_id === filterTeam);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(r => r.user.name.toLowerCase().includes(q) || r.user.email.toLowerCase().includes(q) || r.user.account_id.toLowerCase().includes(q));
    }
    return rows.sort((a, b) => a.user.name.localeCompare(b.user.name, 'tr'));
  }, [users, teams, entries, activityTypes, year, filterTeam, filterProject, search]);

  // Column totals (sum across users for each month)
  const colTotals = useMemo(() => {
    const arr = Array(12).fill(0);
    userRows.forEach(r => {
      r.hoursByMonth.forEach((h, i) => { arr[i] += h; });
    });
    return arr;
  }, [userRows]);

  const grandTotal = colTotals.reduce((s, h) => s + h, 0);
  const yearTargetTotal = yearExpected.reduce((s, d) => s + d, 0) * 8;

  const handleSaveExpected = (values) => {
    values.forEach((v, i) => setExpectedDays(year, i, v));
    setShowEditor(false);
    showToast(`${year} working days güncellendi`);
  };

  const handleExport = () => {
    if (userRows.length === 0) return;
    const yearTargetHours = yearExpected.reduce((s, d) => s + d, 0) * 8;
    const projectLabel = selectedProject ? selectedProject.name : 'Tüm projeler';

    // Header rows
    const headerRow1 = ['Yearly Report', year, '', `Filtre: ${projectLabel}`];
    const headerRow2 = [];
    const headerRow3 = ['Kullanıcı', 'Account ID', 'Takım', ...TR_MONTHS_FULL, 'Yıllık Toplam', 'Hedef (saat)', 'Doluluk %'];
    const expectedRow = ['', '', 'Working days →', ...yearExpected.map(d => `${d} gün`), `${yearExpected.reduce((s, d) => s + d, 0)} gün`, `${yearTargetHours}h`, ''];

    // Data rows: main user row + activity breakdown rows
    const activeActivities = activityTypes.filter(a => a.is_active);
    const dataRows = [];
    userRows.forEach(r => {
      const yearTotal = r.total;
      const pct = yearTargetHours > 0 ? Math.round((yearTotal / yearTargetHours) * 100) : 0;
      // Main row
      dataRows.push([
        r.user.name,
        r.user.account_id,
        r.team?.name || '',
        ...r.hoursByMonth.map(h => h > 0 ? h.toFixed(1) : '0'),
        yearTotal.toFixed(1),
        yearTargetHours,
        `${pct}%`,
      ]);
      // Breakdown rows: one per activity type, indented
      activeActivities.forEach(a => {
        const months = r.breakdownByActivity[a.id] || Array(12).fill(0);
        const aTotal = months.reduce((s, h) => s + h, 0);
        // Skip activity rows that have zero hours all year (cleaner export)
        if (aTotal === 0) return;
        dataRows.push([
          `   └─ ${a.name}`,
          '',
          '',
          ...months.map(h => h > 0 ? h.toFixed(1) : ''),
          aTotal.toFixed(1),
          '',
          '',
        ]);
      });
    });

    // Footer (company total)
    const footerRow = [
      'Şirket toplamı', '', '',
      ...colTotals.map(h => h.toFixed(1)),
      grandTotal.toFixed(1),
      yearTargetHours * userRows.length,
      yearTargetHours > 0 && userRows.length > 0
        ? `${Math.round((grandTotal / (yearTargetHours * userRows.length)) * 100)}%`
        : '0%',
    ];

    const allRows = [headerRow1, headerRow2, headerRow3, expectedRow, ...dataRows, headerRow2, footerRow];
    const csv = allRows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const projectSuffix = selectedProject ? `-${selectedProject.code}` : '';
    a.download = `yearly-report-${year}${projectSuffix}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${userRows.length} kullanıcı için rapor indirildi`);
  };

  return (
    <div style={{ padding: 24, position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px', color: C.textPrimary }}>Yearly Report</h1>
          <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>
            Kullanıcı bazlı aylık workload özeti — beklenen saatlere göre renklendirme
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowEditor(true)}
            style={{
              padding: '8px 14px',
              background: canEditExpected ? `${C.amber}1A` : 'transparent',
              border: `1px solid ${canEditExpected ? C.amber + '40' : C.border}`,
              borderRadius: 6,
              color: canEditExpected ? C.amber : C.textSecondary,
              fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { if (!canEditExpected) { e.currentTarget.style.color = C.textPrimary; e.currentTarget.style.borderColor = C.borderHover; } }}
            onMouseLeave={(e) => { if (!canEditExpected) { e.currentTarget.style.color = C.textSecondary; e.currentTarget.style.borderColor = C.border; } }}
          >
            <Edit2 size={12} /> {canEditExpected ? 'Working days düzenle' : 'Working days göster'}
          </button>
          <button
            onClick={handleExport}
            disabled={userRows.length === 0}
            style={{
              padding: '8px 14px',
              background: userRows.length > 0 ? C.teal : `${C.teal}40`,
              border: 'none', borderRadius: 6,
              color: C.bg, fontSize: 12, fontWeight: 600,
              cursor: userRows.length > 0 ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
            }}
          >
            <Save size={12} /> Excel'e aktar
          </button>
        </div>
      </div>

      {/* Filter row */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          <Calendar size={11} /> Yıl:
        </div>
        <FilterDropdown
          value={year}
          onChange={(v) => setYear(v)}
          placeholder="Yıl seç"
          options={availableYears.map(y => ({ value: y, label: String(y) }))}
        />
        <FilterDropdown
          value={filterTeam}
          onChange={setFilterTeam}
          placeholder="Tüm takımlar"
          options={[
            { value: null, label: 'Tüm takımlar' },
            ...teams.map(t => ({ value: t.id, label: t.name, dotColor: TEAM_COLORS[t.name] })),
          ]}
        />
        <FilterDropdown
          value={filterProject}
          onChange={setFilterProject}
          placeholder="Tüm projeler"
          icon={FolderOpen}
          options={[
            { value: null, label: 'Tüm projeler' },
            ...projects.filter(p => p.is_active).map(p => ({ value: p.id, label: p.name })),
          ]}
        />
        <div style={{ position: 'relative', flex: 1, minWidth: 220, marginLeft: 'auto' }}>
          <Search size={13} color={C.textMuted} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kullanıcı ara..."
            style={{
              width: '100%', padding: '7px 10px 7px 32px', boxSizing: 'border-box',
              background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.textPrimary, fontSize: 12, outline: 'none', fontFamily: 'inherit',
            }}
            onFocus={(e) => e.target.style.borderColor = C.borderFocus}
            onBlur={(e) => e.target.style.borderColor = C.border}
          />
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: C.teal }} />
          <div style={{ fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{year} Hedef</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: C.textPrimary }}>
            {yearTargetTotal} <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 400 }}>saat / kişi</span>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
            {yearExpected.reduce((s, d) => s + d, 0)} working days × 8h
          </div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: C.blue }} />
          <div style={{ fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Toplam giriş</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: C.textPrimary }}>
            {grandTotal.toFixed(1)} <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 400 }}>saat</span>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{userRows.length} kullanıcı</div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: C.purple }} />
          <div style={{ fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Ort. saat / kişi</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: C.textPrimary }}>
            {userRows.length > 0 ? (grandTotal / userRows.length).toFixed(1) : '0'} <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 400 }}>saat</span>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>yıllık ortalama</div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: C.amber }} />
          <div style={{ fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Genel doluluk</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: C.textPrimary }}>
            {yearTargetTotal > 0 && userRows.length > 0
              ? Math.round((grandTotal / (yearTargetTotal * userRows.length)) * 100)
              : 0}%
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>hedefe göre</div>
        </div>
      </div>

      {/* Color legend */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12, fontSize: 11, color: C.textMuted, flexWrap: 'wrap' }}>
        <span style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Renk açıklaması:</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 14, borderRadius: 3, background: TONE_STYLES.green.bg, border: `1px solid ${TONE_STYLES.green.border}` }} />
          <span style={{ color: C.textSecondary }}>Hedef üstü (&gt;100%)</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 14, borderRadius: 3, background: 'transparent', border: `1px solid ${C.border}` }} />
          <span style={{ color: C.textSecondary }}>Tam (100%)</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 14, borderRadius: 3, background: TONE_STYLES.yellow.bg, border: `1px solid ${TONE_STYLES.yellow.border}` }} />
          <span style={{ color: C.textSecondary }}>Eksik (50–99%)</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 14, borderRadius: 3, background: TONE_STYLES.red.bg, border: `1px solid ${TONE_STYLES.red.border}` }} />
          <span style={{ color: C.textSecondary }}>Çok düşük (&lt;50%)</span>
        </span>
        {selectedProject && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: C.amber, display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertCircle size={11} /> "{selectedProject.name}" filtresi aktif — saatler sadece bu proje için
          </span>
        )}
      </div>

      {/* Matrix table */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1100 }}>
            <thead>
              <tr style={{ background: C.surfaceDeep, borderBottom: `1px solid ${C.border}` }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, position: 'sticky', left: 0, background: C.surfaceDeep, zIndex: 2, minWidth: 250 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {userRows.length > 0 && (
                      <button
                        onClick={toggleAll}
                        title={expandedRows.size === userRows.length ? 'Tümünü kapat' : 'Tümünü aç'}
                        style={{
                          background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4,
                          width: 22, height: 22, padding: 0, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: C.textMuted, transition: 'all 0.12s', flexShrink: 0,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = C.teal; e.currentTarget.style.borderColor = C.teal + '60'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = C.border; }}
                      >
                        {expandedRows.size === userRows.length ? <X size={11} /> : <Plus size={11} />}
                      </button>
                    )}
                    <span>Kullanıcı</span>
                  </div>
                </th>
                {TR_MONTHS.map((m, i) => (
                  <th key={m} style={{ padding: '8px 6px', textAlign: 'center', fontSize: 11, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: 500, minWidth: 64 }}>
                    <div>{m}</div>
                    <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2, fontWeight: 400, textTransform: 'none' }}>{yearExpected[i]}d/{yearExpected[i] * 8}h</div>
                  </th>
                ))}
                <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, color: C.teal, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, minWidth: 90, background: C.surfaceDeep }}>Toplam</th>
              </tr>
            </thead>
            <tbody>
              {userRows.length === 0 ? (
                <tr>
                  <td colSpan={14} style={{ padding: '60px 20px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
                    Filtreyle eşleşen kullanıcı bulunamadı
                  </td>
                </tr>
              ) : userRows.map((row) => {
                const yearTotal = row.total;
                const yearTone = getCellTone(yearTotal, yearExpected.reduce((s, d) => s + d, 0));
                const isExpanded = expandedRows.has(row.user.account_id);
                const activityColors = { 1: C.teal, 2: C.amber, 3: C.purple };
                return (
                  <Fragment key={row.user.id}>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '10px 14px', position: 'sticky', left: 0, background: C.surface, zIndex: 1, borderRight: `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button
                            onClick={() => toggleExpand(row.user.account_id)}
                            title={isExpanded ? 'Detayları kapat' : 'Detayları aç'}
                            style={{
                              background: isExpanded ? `${C.teal}1A` : 'transparent',
                              border: `1px solid ${isExpanded ? C.teal + '60' : C.border}`,
                              borderRadius: 4, width: 22, height: 22, padding: 0,
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: isExpanded ? C.teal : C.textMuted,
                              transition: 'all 0.12s', flexShrink: 0,
                            }}
                            onMouseEnter={(e) => { if (!isExpanded) { e.currentTarget.style.color = C.teal; e.currentTarget.style.borderColor = C.teal + '60'; } }}
                            onMouseLeave={(e) => { if (!isExpanded) { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = C.border; } }}
                          >
                            {isExpanded ? <X size={11} /> : <Plus size={11} />}
                          </button>
                          <Avatar name={row.user.name} size={28} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ color: C.textPrimary, fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.user.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              {row.team && <Badge color={TEAM_COLORS[row.team.name]}>{row.team.name}</Badge>}
                            </div>
                          </div>
                        </div>
                      </td>
                      {row.hoursByMonth.map((h, i) => {
                        const tone = getCellTone(h, yearExpected[i]);
                        const style = TONE_STYLES[tone];
                        const display = h > 0 ? h.toFixed(1) : '—';
                        const target = yearExpected[i] * 8;
                        const pct = target > 0 ? Math.round((h / target) * 100) : 0;
                        return (
                          <td key={i} style={{ padding: '4px 6px', textAlign: 'center' }}>
                            <div
                              title={`${TR_MONTHS_FULL[i]}: ${h.toFixed(1)} / ${target}h (${pct}%)`}
                              style={{
                                padding: '8px 4px', borderRadius: 5,
                                background: style.bg, border: `1px solid ${style.border}`,
                                color: tone === 'none' && h === 0 ? C.textMuted : style.text,
                                fontSize: 12, fontWeight: tone === 'none' || tone === 'empty' ? 400 : 500,
                                fontVariantNumeric: 'tabular-nums',
                                cursor: 'help',
                              }}
                            >
                              {display}
                            </div>
                          </td>
                        );
                      })}
                      <td style={{ padding: '4px 14px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block', padding: '8px 12px', borderRadius: 5,
                          background: TONE_STYLES[yearTone].bg, border: `1px solid ${TONE_STYLES[yearTone].border}`,
                          color: yearTone === 'none' && yearTotal === 0 ? C.textMuted : TONE_STYLES[yearTone].text,
                          fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', minWidth: 60,
                        }}>
                          {yearTotal.toFixed(1)}h
                        </div>
                      </td>
                    </tr>

                    {/* Expanded breakdown rows: one per activity type */}
                    {isExpanded && activityTypes.filter(a => a.is_active).map((a) => {
                      const months = row.breakdownByActivity[a.id] || Array(12).fill(0);
                      const aTotal = months.reduce((s, h) => s + h, 0);
                      const aColor = activityColors[a.id] || C.blue;
                      return (
                        <tr key={`${row.user.id}-act-${a.id}`} style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(15, 31, 58, 0.45)' }}>
                          <td style={{ padding: '6px 14px 6px 48px', position: 'sticky', left: 0, background: 'rgba(15, 31, 58, 0.85)', zIndex: 1, borderRight: `1px solid ${C.border}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                              <span style={{ width: 6, height: 6, borderRadius: 1, background: aColor, flexShrink: 0 }} />
                              <span style={{ color: aColor, fontWeight: 500 }}>{a.name}</span>
                            </div>
                          </td>
                          {months.map((h, i) => (
                            <td key={i} style={{ padding: '4px 6px', textAlign: 'center' }}>
                              <div
                                title={`${a.name} · ${TR_MONTHS_FULL[i]}: ${h.toFixed(1)}h`}
                                style={{
                                  padding: '5px 4px', borderRadius: 4,
                                  background: 'transparent',
                                  color: h > 0 ? aColor : C.textMuted,
                                  fontSize: 11, fontWeight: 400,
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {h > 0 ? h.toFixed(1) : '—'}
                              </div>
                            </td>
                          ))}
                          <td style={{ padding: '4px 14px', textAlign: 'right' }}>
                            <span style={{
                              fontSize: 11, fontWeight: 500, color: aTotal > 0 ? aColor : C.textMuted,
                              fontVariantNumeric: 'tabular-nums',
                            }}>{aTotal.toFixed(1)}h</span>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
            {userRows.length > 0 && (
              <tfoot>
                <tr style={{ background: C.surfaceDeep, borderTop: `2px solid ${C.borderHover}` }}>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: C.textPrimary, fontWeight: 500, position: 'sticky', left: 0, background: C.surfaceDeep, borderRight: `1px solid ${C.border}` }}>
                    Şirket toplamı
                  </td>
                  {colTotals.map((h, i) => (
                    <td key={i} style={{ padding: '10px 6px', textAlign: 'center', fontSize: 12, color: C.textPrimary, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                      {h > 0 ? h.toFixed(0) : '—'}
                    </td>
                  ))}
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, color: C.teal, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {grandTotal.toFixed(0)}h
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {showEditor && (
        <ExpectedDaysEditor
          year={year}
          expectedDays={yearExpected}
          canEdit={canEditExpected}
          onSave={handleSaveExpected}
          onClose={() => setShowEditor(false)}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          padding: '12px 18px',
          background: toast.type === 'error' ? C.red : C.surface,
          border: `1px solid ${toast.type === 'error' ? C.red : C.borderHover}`,
          borderRadius: 8, color: toast.type === 'error' ? '#fff' : C.textPrimary,
          fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {toast.type === 'error' ? <AlertCircle size={14} /> : <Check size={14} color={C.green} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
};

// ==================== DASHBOARD PAGE (Org tree) ====================
// Roles excluded from main tree (shown in Other roles panel)
const TREE_EXCLUDED_ROLE_CODES = ['HR', 'QA_SPECIALIST'];

// Get the user's distinct active projects in the current month
const getUserActiveProjects = (accountId, entries, projects) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const projectIds = new Set();
  entries.forEach(e => {
    if (e.account_id !== accountId) return;
    const d = new Date(e.work_date);
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    projectIds.add(e.project_id);
  });
  return Array.from(projectIds)
    .map(pid => projects.find(p => p.id === pid))
    .filter(Boolean);
};

// Project palette for badges (deterministic by project id)
const PROJECT_BADGE_COLORS = [C.teal, C.blue, C.purple, C.amber, C.pink, C.green, '#06B6D4'];

const OrgNode = ({ user, allUsers, entries, projects, teams, level }) => {
  const team = teams.find(t => t.id === user.team_id);
  const children = allUsers.filter(u => u.is_active && u.manager_account_id === user.account_id && !TREE_EXCLUDED_ROLE_CODES.includes(MOCK_ROLES.find(r => r.id === u.role_id)?.code));
  const hasChildren = children.length > 0;
  const activeProjects = getUserActiveProjects(user.account_id, entries, projects);

  // Level palette (Director, HEM, EM, TL/Worker)
  const levelColors = [C.amber, C.purple, C.blue, C.teal, C.pink];
  const lvColor = levelColors[Math.min(level, levelColors.length - 1)];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      {/* Node card */}
      <div style={{
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: '10px 14px', minWidth: 220, maxWidth: 260,
        position: 'relative', transition: 'all 0.15s',
        zIndex: 1,
      }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = lvColor; e.currentTarget.style.boxShadow = `0 0 0 2px ${lvColor}1F`; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none'; }}
      >
        {/* Top accent stripe */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: lvColor, borderRadius: '8px 8px 0 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 6 }}>
          <Avatar name={user.name} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user.name}>{user.name}</div>
            <div style={{ fontSize: 10, color: lvColor, fontWeight: 500, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user.position}>{user.position}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: activeProjects.length > 0 ? 6 : 0 }}>
          {team && <Badge color={TEAM_COLORS[team.name]}>{team.name}</Badge>}
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: C.textMuted, padding: '1px 5px', border: `1px solid ${C.border}`, borderRadius: 3 }}>{user.account_id}</span>
          {hasChildren && (
            <span style={{ fontSize: 9, color: C.textMuted, padding: '1px 6px', background: C.surfaceDeep, borderRadius: 3 }}>
              {children.length} report{children.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {activeProjects.length > 0 && (
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', paddingTop: 6, borderTop: `1px solid ${C.border}` }}>
            {activeProjects.map((p) => {
              const color = PROJECT_BADGE_COLORS[(p.id - 1) % PROJECT_BADGE_COLORS.length];
              return (
                <span key={p.id} style={{
                  fontSize: 9, padding: '1px 5px', borderRadius: 3,
                  background: `${color}1A`, color, fontWeight: 500,
                  border: `1px solid ${color}33`,
                }} title={p.name}>
                  {p.code}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Vertical line down to children area */}
      {hasChildren && (() => {
        // Split children into branches (have their own reports) and leaves (no reports)
        const isLeaf = (u) => !allUsers.some(c => c.is_active && c.manager_account_id === u.account_id && !TREE_EXCLUDED_ROLE_CODES.includes(MOCK_ROLES.find(r => r.id === c.role_id)?.code));
        const branches = children.filter(c => !isLeaf(c));
        const leaves = children.filter(c => isLeaf(c));

        return (
          <>
            <div style={{ width: 1, height: 24, background: 'rgba(148, 163, 184, 0.25)' }} />

            {/* Branches row (full org-tree continuation) */}
            {branches.length > 0 && (
              <>
                {/* Horizontal connector for multiple branches */}
                {branches.length > 1 && (
                  <div style={{ width: '100%', position: 'relative', height: 0 }}>
                    <div style={{
                      position: 'absolute',
                      left: `calc(${100 / (branches.length * 2)}%)`,
                      right: `calc(${100 / (branches.length * 2)}%)`,
                      height: 1,
                      background: 'rgba(148, 163, 184, 0.25)',
                    }} />
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 24 }}>
                  {branches.map((child) => (
                    <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      <div style={{ width: 1, height: 24, background: 'rgba(148, 163, 184, 0.25)' }} />
                      <OrgNode
                        user={child}
                        allUsers={allUsers}
                        entries={entries}
                        projects={projects}
                        teams={teams}
                        level={level + 1}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Leaves: compact 2-column list under parent */}
            {leaves.length > 0 && (
              <div style={{
                marginTop: branches.length > 0 ? 18 : 0,
                background: C.surfaceDeep, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: 10, minWidth: 280, maxWidth: 520,
              }}>
                <div style={{ fontSize: 10, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, paddingLeft: 2 }}>
                  Direct reports ({leaves.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  {leaves.map((leaf) => {
                    const leafTeam = teams.find(t => t.id === leaf.team_id);
                    const leafProjects = getUserActiveProjects(leaf.account_id, entries, projects);
                    const leafColor = levelColors[Math.min(level + 1, levelColors.length - 1)];
                    return (
                      <div key={leaf.id} style={{
                        padding: '6px 8px', background: C.bg, border: `1px solid ${C.border}`,
                        borderRadius: 6, transition: 'all 0.15s', minWidth: 0,
                      }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = leafColor}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = C.border}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                          <Avatar name={leaf.name} size={24} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leaf.name}>{leaf.name}</div>
                            <div style={{ fontSize: 9, color: leafColor, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leaf.position}>{leaf.position}</div>
                          </div>
                        </div>
                        {leafProjects.length > 0 && (
                          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 5, paddingTop: 5, borderTop: `1px solid ${C.border}` }}>
                            {leafProjects.map((p) => {
                              const color = PROJECT_BADGE_COLORS[(p.id - 1) % PROJECT_BADGE_COLORS.length];
                              return (
                                <span key={p.id} style={{
                                  fontSize: 9, padding: '1px 5px', borderRadius: 3,
                                  background: `${color}1A`, color, fontWeight: 500,
                                  border: `1px solid ${color}33`,
                                }} title={p.name}>
                                  {p.code}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
};

const DashboardPage = () => {
  const { users, teams, roles } = useAuth();
  const { entries, projects } = useWorkload();

  // Find root: System Administrator (Director). Fallback to user with role ADMIN and no manager.
  const root = useMemo(() => {
    return users.find(u => u.is_active && u.position === 'System Administrator')
      || users.find(u => u.is_active && roles.find(r => r.id === u.role_id)?.code === 'ADMIN' && !u.manager_account_id)
      || users.find(u => u.is_active && roles.find(r => r.id === u.role_id)?.code === 'ADMIN');
  }, [users, roles]);

  // Tree-excluded users (HR + QA, active)
  const otherUsers = useMemo(() => {
    return users.filter(u => {
      if (!u.is_active) return false;
      const role = roles.find(r => r.id === u.role_id);
      return role && TREE_EXCLUDED_ROLE_CODES.includes(role.code);
    }).sort((a, b) => {
      const ra = roles.find(r => r.id === a.role_id)?.code || '';
      const rb = roles.find(r => r.id === b.role_id)?.code || '';
      if (ra !== rb) return ra.localeCompare(rb);
      return a.name.localeCompare(b.name, 'tr');
    });
  }, [users, roles]);

  // Top stats: total people in tree, in other panel
  const totalUsers = users.filter(u => u.is_active).length;
  const treeUsers = totalUsers - otherUsers.length;

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px', color: C.textPrimary }}>Şirket organizasyonu</h1>
        <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>
          Yönetim hiyerarşisi · {totalUsers} aktif çalışan ({treeUsers} hiyerarşide, {otherUsers.length} diğer roller)
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, alignItems: 'flex-start' }}>
        {/* TREE */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={14} color={C.teal} />
                Yönetim hiyerarşisi
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                Director → Head of Engineering → Manager → Tech Lead → Worker
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, padding: '3px 9px', border: `1px solid ${C.border}`, borderRadius: 4 }}>
              {treeUsers} kişi
            </div>
          </div>

          {root ? (
            <div style={{ marginTop: 12, padding: '20px 0', overflowX: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'center', minWidth: 'fit-content' }}>
                <OrgNode
                  user={root}
                  allUsers={users}
                  entries={entries}
                  projects={projects}
                  teams={teams}
                  level={0}
                />
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted, fontSize: 12 }}>
              Director bulunamadı (System Administrator pozisyonunda kullanıcı yok)
            </div>
          )}

          {/* Project badge legend */}
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Bu ayki projeler:</span>
            {projects.filter(p => p.is_active).map((p) => {
              const color = PROJECT_BADGE_COLORS[(p.id - 1) % PROJECT_BADGE_COLORS.length];
              return (
                <span key={p.id} style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 3,
                  background: `${color}1A`, color, fontWeight: 500,
                  border: `1px solid ${color}33`,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ fontFamily: 'monospace', opacity: 0.8 }}>{p.code}</span>
                  <span>{p.name}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* OTHER ROLES PANEL */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, position: 'sticky', top: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={14} color={C.purple} />
                Diğer roller
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>HR ve QA çalışanları</div>
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, padding: '3px 9px', border: `1px solid ${C.border}`, borderRadius: 4 }}>
              {otherUsers.length}
            </div>
          </div>

          {otherUsers.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 12, color: C.textMuted, border: `1px dashed ${C.border}`, borderRadius: 6 }}>
              Bu roldeki kullanıcı yok
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Group by role */}
              {Object.entries(otherUsers.reduce((acc, u) => {
                const role = roles.find(r => r.id === u.role_id);
                const key = role?.code || 'OTHER';
                if (!acc[key]) acc[key] = { name: role?.name || 'Other', users: [] };
                acc[key].users.push(u);
                return acc;
              }, {})).map(([code, group]) => {
                const groupColor = code === 'HR' ? C.amber : code === 'QA_SPECIALIST' ? C.pink : C.textMuted;
                return (
                  <div key={code}>
                    <div style={{ fontSize: 10, color: groupColor, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 6, paddingLeft: 4 }}>
                      {group.name} <span style={{ color: C.textMuted, fontWeight: 400 }}>({group.users.length})</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                      {group.users.map((u) => {
                        const team = teams.find(t => t.id === u.team_id);
                        const activeProjects = getUserActiveProjects(u.account_id, entries, projects);
                        return (
                          <div key={u.id} style={{
                            padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6,
                            transition: 'border 0.12s',
                          }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = C.borderHover}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = C.border}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Avatar name={u.name} size={26} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 500, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>{u.position}</div>
                              </div>
                            </div>
                            {activeProjects.length > 0 && (
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                                {activeProjects.map((p) => {
                                  const color = PROJECT_BADGE_COLORS[(p.id - 1) % PROJECT_BADGE_COLORS.length];
                                  return (
                                    <span key={p.id} style={{
                                      fontSize: 9, padding: '1px 5px', borderRadius: 3,
                                      background: `${color}1A`, color, fontWeight: 500,
                                      border: `1px solid ${color}33`,
                                    }} title={p.name}>
                                      {p.code}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== ROUTES (placeholders for now) ====================
const PlaceholderPage = ({ title, description, icon: Icon, color }) => (
  <div style={{ padding: 24 }}>
    <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px', color: C.textPrimary }}>{title}</h1>
    <p style={{ fontSize: 13, color: C.textSecondary, margin: '0 0 24px' }}>{description}</p>
    <div style={{
      background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 10,
      padding: '60px 24px', textAlign: 'center',
    }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}1F`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Icon size={22} color={color} />
      </div>
      <div style={{ fontSize: 14, color: C.textSecondary, marginBottom: 4 }}>Bu ekran sonraki phase'de tamamlanacak</div>
      <div style={{ fontSize: 11, color: C.textMuted }}>Şu anda iskelet + login + nav hazır</div>
    </div>
  </div>
);

// ==================== APP SHELL ====================
const AppShell = () => {
  const { currentUser } = useAuth();
  const { currentRoute } = useRouter();

  if (!currentUser) return <LoginScreen />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', color: C.textPrimary }}>
      <TopNav />
      {currentRoute === 'dashboard' && <DashboardPage />}
      {currentRoute === 'workload-entry' && <WorkloadEntryPage />}
      {currentRoute === 'workload-list' && <WorkloadListPage />}
      {currentRoute === 'yearly-report' && <YearlyReportPage />}
      {currentRoute === 'users' && <UsersPage />}
      {currentRoute === 'lookups' && <LookupsPage />}
    </div>
  );
};

// ==================== ROOT ====================
export default function App() {
  return (
    <AuthProvider>
      <WorkloadProvider>
        <RouterProvider>
          <AppShell />
        </RouterProvider>
      </WorkloadProvider>
    </AuthProvider>
  );
}