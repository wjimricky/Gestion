/**
 * Security Rules Verification Suite — Dirty Dozen Payloads
 * Expected outcome for every adversarial payload below: PERMISSION_DENIED
 */
export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_SECURITY_CASES: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unverified email project create',
    operation: 'create',
    path: '/projects/proj_1',
    auth: { uid: 'uidA', email_verified: false },
    payload: {
      id: 'proj_1',
      ownerId: 'uidA',
      name: 'Rizerie Alaotra',
      description: 'Test',
      source: 'default',
      activeScenarioId: 'base',
      assumptions: { corporateTaxRate: 0.2 },
      savedScenarios: [],
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Owner identity spoofing on create',
    operation: 'create',
    path: '/projects/proj_2',
    auth: { uid: 'uidA', email_verified: true },
    payload: {
      id: 'proj_2',
      ownerId: 'uidB',
      name: 'Spoofed',
      description: '',
      source: 'default',
      activeScenarioId: 'base',
      assumptions: { corporateTaxRate: 0.2 },
      savedScenarios: [],
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-tenant list scraping without owner filter',
    operation: 'list',
    path: '/projects',
    auth: { uid: 'uidA', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Ghost field injection on project update',
    operation: 'update',
    path: '/projects/proj_1',
    auth: { uid: 'uidA', email_verified: true },
    payload: {
      name: 'Updated',
      isAdmin: true,
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Owner transfer hijack on project update',
    operation: 'update',
    path: '/projects/proj_1',
    auth: { uid: 'uidA', email_verified: true },
    payload: {
      ownerId: 'uidB',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Client-forged timestamp on create',
    operation: 'create',
    path: '/projects/proj_3',
    auth: { uid: 'uidA', email_verified: true },
    payload: {
      id: 'proj_3',
      ownerId: 'uidA',
      name: 'Backdated',
      description: '',
      source: 'default',
      activeScenarioId: 'base',
      assumptions: { corporateTaxRate: 0.2 },
      savedScenarios: [],
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Invalid project document ID characters',
    operation: 'create',
    path: '/projects/bad$project!id',
    auth: { uid: 'uidA', email_verified: true },
    payload: {
      id: 'bad$project!id',
      ownerId: 'uidA',
      name: 'Poisoned ID',
      description: '',
      source: 'default',
      activeScenarioId: 'base',
      assumptions: { corporateTaxRate: 0.2 },
      savedScenarios: [],
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Cross-user PII read on private profile',
    operation: 'get',
    path: '/users/uidA/private/profile',
    auth: { uid: 'uidB', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Unauthorized private subcollection doc ID',
    operation: 'create',
    path: '/users/uidA/private/shadow',
    auth: { uid: 'uidA', email_verified: true },
    payload: {
      uid: 'uidA',
      email: 'a@example.com',
      analystName: 'Analyst',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Unbounded savedScenarios list > 25 items',
    operation: 'update',
    path: '/projects/proj_1',
    auth: { uid: 'uidA', email_verified: true },
    payload: {
      savedScenarios: Array.from({ length: 26 }, (_, i) => ({ id: `sc_${i}` })),
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Type poisoning: assumptions written as string instead of map',
    operation: 'update',
    path: '/projects/proj_1',
    auth: { uid: 'uidA', email_verified: true },
    payload: {
      assumptions: '{"json":true}',
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Oversized dashboardReportNotes > 10000 chars',
    operation: 'update',
    path: '/projects/proj_1',
    auth: { uid: 'uidA', email_verified: true },
    payload: {
      dashboardReportNotes: 'x'.repeat(10001),
      updatedAt: 'REQUEST_TIME',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
