export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api',
  demoMode: true,
  fallbackToMockOnError: true,
  seedBackendOnEmpty: false,
  endpoints: {
    auth: {
      login: '/auth/login',
      changePassword: '/auth/change-password'
    },
    pgs: {
      list: '/owner/pgs',
      create: '/owner/pgs'
    },
    rooms: {
      listByPg: '/owner/pgs/:pgId/rooms',
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
