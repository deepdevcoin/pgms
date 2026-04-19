export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api',
  demoMode: true,
  fallbackToMockOnError: false,
  seedBackendOnEmpty: false,
  endpoints: {
    auth: {
      login: '/auth/login',
      changePassword: '/auth/change-password'
    },
    pgs: {
      ownerList: '/owner/pgs',
      ownerLayoutList: '/owner/layout-pgs',
      managerList: '/manager/pgs',
      create: '/owner/pgs'
    },
    rooms: {
      ownerListByPg: '/owner/pgs/:pgId/rooms',
      ownerLayoutByPg: '/owner/pgs/:pgId/layout',
      managerLayoutByPg: '/manager/pgs/:pgId/layout',
      update: '/manager/rooms/:id',
      create: '/owner/pgs/:pgId/rooms'
    },
    managers: {
      list: '/owner/managers',
      create: '/owner/managers'
    },
    tenants: {
      list: '/manager/tenants',
      profile: '/tenant/profile',
      create: '/manager/tenants'
    },
    analytics: {
      ownerSummary: '/analytics/owner-summary',
      managerSummary: '/analytics/manager-summary'
    }
  }
} as const;
