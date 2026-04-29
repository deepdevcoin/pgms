export const environment = {
  production: true,
  apiBaseUrl: '/api',
  demoMode: false,
  fallbackToMockOnError: false,
  seedBackendOnEmpty: false,
  endpoints: {
    auth: {
      login: '/auth/login',
      changePassword: '/auth/change-password',
      resetPassword: '/auth/reset-password'
    },
    pgs: {
      ownerList: '/owner/pgs',
      ownerLayoutList: '/owner/layout-pgs',
      managerList: '/manager/pgs',
      create: '/owner/pgs',
      update: '/owner/pgs/:id'
    },
    rooms: {
      ownerListByPg: '/owner/pgs/:pgId/rooms',
      ownerLayoutByPg: '/owner/pgs/:pgId/layout',
      managerLayoutByPg: '/manager/pgs/:pgId/layout',
      update: '/manager/rooms/:id',
      ownerUpdate: '/owner/rooms/:id',
      managerCleaningStatus: '/manager/rooms/:id/cleaning-status',
      ownerCleaningStatus: '/owner/rooms/:id/cleaning-status',
      create: '/owner/pgs/:pgId/rooms'
    },
    managers: {
      list: '/owner/managers',
      create: '/owner/managers',
      delete: '/owner/managers/:id'
    },
    tenants: {
      list: '/manager/tenants',
      ownerList: '/owner/tenants',
      profile: '/tenant/profile',
      create: '/manager/tenants',
      ownerCreate: '/owner/tenants',
      move: '/manager/tenants/:id/move',
      ownerMove: '/owner/tenants/:id/move',
      accountStatus: '/manager/tenants/:id/account-status',
      ownerAccountStatus: '/owner/tenants/:id/account-status',
      archive: '/manager/tenants/:id',
      ownerArchive: '/owner/tenants/:id'
    },
    kyc: {
      tenantProfile: '/tenant/kyc',
      tenantUpload: '/tenant/kyc/document',
      tenantDocument: '/tenant/kyc/document',
      managerList: '/manager/kyc',
      managerVerify: '/manager/kyc/:id/verify',
      managerRequestReplacement: '/manager/kyc/:id/request-replacement',
      managerDocument: '/manager/kyc/:id/document'
    },
    analytics: {
      ownerSummary: '/analytics/owner-summary',
      managerSummary: '/analytics/manager-summary'
    },
    payments: {
      tenant: '/tenant/payments',
      tenantOverview: '/tenant/payments/overview',
      tenantPay: '/tenant/payments/pay',
      applyCredit: '/tenant/payments/apply-credit',
      manager: '/manager/payments',
      managerOverview: '/manager/payments/overview',
      owner: '/owner/payments',
      ownerOverview: '/owner/payments/overview',
      cash: '/manager/payments/cash',
      waiveFine: '/manager/payments/:id/waive-fine',
      ownerWaiveFine: '/owner/payments/:id/waive-fine'
    },
    complaints: {
      tenant: '/tenant/complaints',
      tenantHistory: '/tenant/complaints/:id/activities',
      tenantComment: '/tenant/complaints/:id/comment',
      manager: '/manager/complaints',
      managerHistory: '/manager/complaints/:id/activities',
      managerComment: '/manager/complaints/:id/comment',
      managerUpdate: '/manager/complaints/:id/update-status',
      owner: '/owner/complaints',
      ownerHistory: '/owner/complaints/:id/activities',
      ownerComment: '/owner/complaints/:id/comment',
      ownerUpdate: '/owner/complaints/:id/update-status'
    },
    notices: {
      list: '/notices',
      ownerList: '/notices/owner',
      create: '/notices',
      ownerCreate: '/notices/owner',
      read: '/notices/:id/read',
      ownerRead: '/notices/owner/:id/read',
      receipts: '/notices/:id/receipts',
      ownerReceipts: '/notices/owner/:id/receipts'
    },
    vacate: {
      tenant: '/tenant/vacate',
      manager: '/manager/vacate-notices',
      approveReferral: '/manager/vacate-notices/:id/approve-referral',
      reject: '/manager/vacate-notices/:id/reject',
      checkout: '/manager/vacate-notices/:id/checkout'
    },
    services: {
      tenant: '/tenant/services',
      tenantRate: '/tenant/services/:id/rate',
      manager: '/manager/services',
      managerUpdate: '/manager/services/:id/update-status',
      owner: '/owner/services',
      ownerUpdate: '/owner/services/:id/update-status'
    },
    amenities: {
      managerConfigs: '/manager/amenities/configs',
      managerCreateConfig: '/manager/amenities/configs',
      managerUpdateConfig: '/manager/amenities/configs/:id',
      managerDeleteConfig: '/manager/amenities/configs/:id',
      managerSlots: '/manager/amenities/slots',
      managerUpdateSlot: '/manager/amenities/slots/:id',
      managerDeleteSlot: '/manager/amenities/slots/:id',
      managerBookings: '/manager/amenities/bookings',
      tenantSlots: '/tenant/amenities/slots',
      tenantBook: '/tenant/amenities/book',
      tenantCancel: '/tenant/amenities/bookings/:id',
      openInvites: '/tenant/amenities/open-invites',
      joinInvite: '/tenant/amenities/join/:slotId'
    },
    menu: {
      list: '/menu',
      ownerList: '/menu/owner',
      save: '/menu',
      ownerSave: '/menu/owner'
    },
    sublets: {
      tenant: '/tenant/sublet',
      delete: '/tenant/sublet/:id',
      wallet: '/tenant/wallet',
      manager: '/manager/sublets',
      approve: '/manager/sublets/:id/approve',
      unapprove: '/manager/sublets/:id/unapprove',
      reject: '/manager/sublets/:id/reject',
      checkIn: '/manager/sublets/:id/check-in',
      checkout: '/manager/sublets/:id/checkout'
    }
  }
} as const;
