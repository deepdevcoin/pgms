export const environment = {
  production: true,
  apiBaseUrl: '/api',
  demoMode: false,
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
      ownerList: '/owner/tenants',
      profile: '/tenant/profile',
      create: '/manager/tenants'
    },
    analytics: {
      ownerSummary: '/analytics/owner-summary',
      managerSummary: '/analytics/manager-summary'
    },
    payments: {
      tenant: '/tenant/payments',
      tenantPay: '/tenant/payments/pay',
      applyCredit: '/tenant/payments/apply-credit',
      manager: '/manager/payments',
      cash: '/manager/payments/cash',
      waiveFine: '/manager/payments/:id/waive-fine'
    },
    complaints: {
      tenant: '/tenant/complaints',
      manager: '/manager/complaints',
      managerUpdate: '/manager/complaints/:id/update-status',
      owner: '/owner/complaints',
      ownerUpdate: '/owner/complaints/:id/update-status'
    },
    notices: {
      list: '/notices',
      create: '/notices',
      read: '/notices/:id/read'
    },
    vacate: {
      tenant: '/tenant/vacate',
      manager: '/manager/vacate-notices',
      approveReferral: '/manager/vacate-notices/:id/approve-referral',
      checkout: '/manager/vacate-notices/:id/checkout'
    },
    services: {
      tenant: '/tenant/services',
      tenantRate: '/tenant/services/:id/rate',
      manager: '/manager/services',
      managerUpdate: '/manager/services/:id/update-status'
    },
    amenities: {
      managerSlots: '/manager/amenities/slots',
      managerBookings: '/manager/amenities/bookings',
      tenantSlots: '/tenant/amenities/slots',
      tenantBook: '/tenant/amenities/book',
      tenantCancel: '/tenant/amenities/bookings/:id',
      openInvites: '/tenant/amenities/open-invites',
      joinInvite: '/tenant/amenities/join/:slotId'
    },
    menu: {
      list: '/menu',
      save: '/menu'
    },
    sublets: {
      tenant: '/tenant/sublet',
      wallet: '/tenant/wallet',
      manager: '/manager/sublets',
      approve: '/manager/sublets/:id/approve',
      complete: '/manager/sublets/:id/complete'
    }
  }
} as const;
