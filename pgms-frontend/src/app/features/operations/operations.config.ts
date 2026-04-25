import { Role } from '../../core/models';
import { ActionConfig, ModuleConfig, ModuleKey } from './operations.types';

export interface OperationsActionHandlers {
  payRent: (row: Record<string, any>) => void;
  applyCredit: (row: Record<string, any>) => void;
  waiveFine: (row: Record<string, any>) => void;
  complaintInProgress: (row: Record<string, any>) => void;
  complaintResolve: (row: Record<string, any>) => void;
  noticeMarkRead: (row: Record<string, any>) => void;
  noticeReceipts: (row: Record<string, any>) => void;
  vacateApprove: (row: Record<string, any>) => void;
  vacateReject: (row: Record<string, any>) => void;
  vacateCheckout: (row: Record<string, any>) => void;
  serviceConfirm: (row: Record<string, any>) => void;
  serviceComplete: (row: Record<string, any>) => void;
  serviceRate: (row: Record<string, any>) => void;
  amenityBook: (row: Record<string, any>) => void;
  amenityOpenInvite: (row: Record<string, any>) => void;
  amenityJoin: (row: Record<string, any>) => void;
  amenityCancel: (row: Record<string, any>) => void;
  subletApprove: (row: Record<string, any>) => void;
  subletComplete: (row: Record<string, any>) => void;
}

export function buildModuleConfig(role: Role | null, pgOptions: string[], pgName: (value: string) => string): Record<ModuleKey, ModuleConfig> {
  return {
    payments: {
      crumb: 'Finance',
      title: 'Payments',
      subtitle: role === 'TENANT' ? 'Rent dues, payment history and wallet credits.' : 'Rent collection, pending dues and fine handling.',
      columns: role === 'TENANT'
        ? ['billingMonth', 'rentAmount', 'totalDue', 'amountPaid', 'fineAccrued', 'remainingAmountDue', 'dueDate', 'status']
        : ['tenantName', 'pgName', 'roomNumber', 'billingMonth', 'totalDue', 'amountPaid', 'fineAccrued', 'remainingAmountDue', 'dueDate', 'status'],
      fields: []
    },
    complaints: {
      crumb: 'Support',
      title: 'Complaints',
      subtitle: role === 'TENANT' ? 'Raise and track complaints.' : 'Track complaint SLA, ownership and resolution.',
      columns: ['id', 'tenantName', 'roomNumber', 'category', 'status', 'createdAt', 'notes'],
      createLabel: role === 'TENANT' ? 'Raise complaint' : undefined,
      fields: role === 'TENANT' ? [
        { key: 'category', label: 'Category', type: 'select', options: ['MAINTENANCE', 'NOISE', 'HYGIENE', 'FOOD', 'OTHER', 'AGAINST_MANAGER'] },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'attachmentPath', label: 'Attachment path', type: 'text' }
      ] : []
    },
    notices: {
      crumb: 'Communication',
      title: 'Notices',
      subtitle: 'Announcements with read tracking.',
      columns: role === 'TENANT'
        ? ['title', 'content', 'createdByName', 'createdAt']
        : ['title', 'targetType', 'createdByName', 'createdAt', 'readCount'],
      createLabel: role === 'OWNER' || role === 'MANAGER' ? 'Compose notice' : undefined,
      fields: role === 'OWNER' || role === 'MANAGER' ? [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'content', label: 'Content', type: 'textarea' },
        { key: 'targetType', label: 'Target', type: 'select', options: role === 'OWNER' ? ['ALL_PGS', 'SPECIFIC_PG', 'ALL_MANAGERS', 'SPECIFIC_TENANT'] : ['SPECIFIC_PG', 'SPECIFIC_TENANT'] },
        { key: 'targetPgId', label: 'Target PG ID', type: 'number' },
        { key: 'targetUserId', label: 'Target user ID', type: 'number' }
      ] : []
    },
    vacate: {
      crumb: 'Lifecycle',
      title: 'Vacate Notices',
      subtitle: role === 'TENANT' ? 'Submit and track your vacate request.' : 'Manage vacate notices, referrals and checkout.',
      columns: ['tenantName', 'roomNumber', 'intendedVacateDate', 'status', 'refundEligible', 'advanceRefundAmount', 'referralName'],
      createLabel: role === 'TENANT' ? 'Request vacate' : undefined,
      fields: role === 'TENANT' ? [
        { key: 'intendedVacateDate', label: 'Vacate date', type: 'date' },
        { key: 'hasReferral', label: 'Has referral', type: 'checkbox' },
        { key: 'referralName', label: 'Referral name', type: 'text' },
        { key: 'referralPhone', label: 'Referral phone', type: 'text' },
        { key: 'referralEmail', label: 'Referral email', type: 'text' }
      ] : []
    },
    services: {
      crumb: 'Operations',
      title: 'Service Bookings',
      subtitle: role === 'TENANT' ? 'Book cleaning and maintenance services.' : 'Confirm, complete and track service quality.',
      columns: ['tenantName', 'roomNumber', 'serviceType', 'preferredDate', 'preferredTimeWindow', 'status', 'rating'],
      createLabel: role === 'TENANT' ? 'Book service' : undefined,
      fields: role === 'TENANT' ? [
        { key: 'serviceType', label: 'Service type', type: 'select', options: ['ROOM_CLEANING', 'LINEN_CHANGE', 'PEST_CONTROL', 'PLUMBING_INSPECTION', 'ELECTRICAL_CHECK'] },
        { key: 'preferredDate', label: 'Preferred date', type: 'date' },
        { key: 'preferredTimeWindow', label: 'Time window', type: 'text' }
      ] : []
    },
    amenities: {
      crumb: 'Bookings',
      title: 'Amenities',
      subtitle: role === 'TENANT' ? 'Book shared slots and join open invites.' : 'Configure slots and monitor utilization.',
      columns: role === 'TENANT'
        ? ['facilityName', 'amenityType', 'slotDate', 'startTime', 'endTime', 'capacity', 'bookingCount']
        : ['pgId', 'amenityType', 'facilityName', 'slotDate', 'startTime', 'endTime', 'capacity', 'bookingCount', 'status'],
      createLabel: role === 'MANAGER' ? 'Create slot' : undefined,
      fields: role === 'MANAGER' ? [
        { key: 'pgId', label: 'PG', type: 'select', options: pgOptions, optionLabel: option => pgName(option) },
        { key: 'amenityType', label: 'Amenity', type: 'select', options: ['WASHING_MACHINE', 'TABLE_TENNIS', 'CARROM', 'BADMINTON'] },
        { key: 'facilityName', label: 'Facility name', type: 'text' },
        { key: 'slotDate', label: 'Date', type: 'date' },
        { key: 'startTime', label: 'Start', type: 'time' },
        { key: 'endTime', label: 'End', type: 'time' },
        { key: 'capacity', label: 'Capacity', type: 'number' }
      ] : []
    },
    menu: {
      crumb: 'Meals',
      title: 'Weekly Menu',
      subtitle: 'View and publish meal plans by PG and week.',
      columns: ['pgId', 'weekLabel', 'dayOfWeek', 'mealType', 'itemNames', 'isVeg'],
      createLabel: role === 'OWNER' || role === 'MANAGER' ? 'Edit meal' : undefined,
      fields: [
        { key: 'pgId', label: 'PG ID', type: 'number' },
        { key: 'weekLabel', label: 'Week label', type: 'text' },
        { key: 'dayOfWeek', label: 'Day', type: 'select', options: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'], show: r => r === 'OWNER' || r === 'MANAGER' },
        { key: 'mealType', label: 'Meal', type: 'select', options: ['BREAKFAST', 'LUNCH', 'DINNER'], show: r => r === 'OWNER' || r === 'MANAGER' },
        { key: 'itemNames', label: 'Items', type: 'text', show: r => r === 'OWNER' || r === 'MANAGER' },
        { key: 'isVeg', label: 'Veg', type: 'checkbox', show: r => r === 'OWNER' || r === 'MANAGER' }
      ]
    },
    sublets: {
      crumb: 'Credits',
      title: 'Sublets',
      subtitle: role === 'TENANT' ? 'Request a temporary sublet and earn wallet credit.' : 'Approve sublets and complete guest checkout.',
      columns: ['tenantName', 'roomNumber', 'startDate', 'endDate', 'status', 'guestName', 'checkInDate', 'checkOutDate'],
      createLabel: role === 'TENANT' ? 'Request sublet' : undefined,
      fields: role === 'TENANT' ? [
        { key: 'startDate', label: 'Start date', type: 'date' },
        { key: 'endDate', label: 'End date', type: 'date' },
        { key: 'reason', label: 'Reason', type: 'textarea' }
      ] : []
    }
  };
}

export function buildModuleActions(role: Role | null, handlers: OperationsActionHandlers): Record<ModuleKey, ActionConfig[]> {
  return {
    payments: [
      { label: 'Pay', icon: 'payments', show: row => role === 'TENANT' && row['remainingAmountDue'] > 0, run: handlers.payRent },
      { label: 'Use wallet', icon: 'account_balance_wallet', show: row => role === 'TENANT' && row['remainingAmountDue'] > 0 && row['walletAvailable'] > 0, run: handlers.applyCredit },
      { label: 'Waive fine', icon: 'money_off', show: row => role === 'MANAGER' && row['fineAccrued'] > 0, run: handlers.waiveFine }
    ],
    complaints: [
      { label: 'In progress', icon: 'hourglass_top', show: row => role !== 'TENANT' && row['status'] !== 'RESOLVED', run: handlers.complaintInProgress },
      { label: 'Resolve', icon: 'task_alt', show: row => role !== 'TENANT' && row['status'] !== 'RESOLVED', run: handlers.complaintResolve },
      { label: 'Read', icon: 'visibility', show: () => false, run: () => undefined }
    ],
    notices: [
      { label: 'Mark read', icon: 'done_all', show: row => !row['read'], run: handlers.noticeMarkRead },
      { label: 'Receipts', icon: 'visibility', show: () => role !== 'TENANT', run: handlers.noticeReceipts }
    ],
    vacate: [
      { label: 'Approve referral', icon: 'how_to_reg', show: row => role === 'MANAGER' && row['referralName'] && row['status'] === 'PENDING', run: handlers.vacateApprove },
      { label: 'Reject referral', icon: 'person_remove', show: row => role === 'MANAGER' && row['referralName'] && row['status'] === 'PENDING', run: handlers.vacateReject },
      { label: 'Checkout', icon: 'logout', show: row => role === 'MANAGER' && row['status'] !== 'CHECKED_OUT', run: handlers.vacateCheckout }
    ],
    services: [
      { label: 'Confirm', icon: 'event_available', show: row => role === 'MANAGER' && row['status'] === 'REQUESTED', run: handlers.serviceConfirm },
      { label: 'Complete', icon: 'task_alt', show: row => role === 'MANAGER' && row['status'] !== 'COMPLETED', run: handlers.serviceComplete },
      { label: 'Rate', icon: 'star', show: row => role === 'TENANT' && row['status'] === 'COMPLETED' && !row['rating'], run: handlers.serviceRate }
    ],
    amenities: [
      { label: 'Book', icon: 'event', show: row => role === 'TENANT' && !row['bookingId'], run: handlers.amenityBook },
      { label: 'Open invite', icon: 'groups', show: row => role === 'TENANT' && !row['bookingId'], run: handlers.amenityOpenInvite },
      { label: 'Join', icon: 'group_add', show: row => role === 'TENANT' && row['openInvite'], run: handlers.amenityJoin },
      { label: 'Cancel', icon: 'event_busy', show: row => role === 'TENANT' && row['bookingId'], run: handlers.amenityCancel }
    ],
    menu: [],
    sublets: [
      { label: 'Approve', icon: 'check_circle', show: row => role === 'MANAGER' && row['status'] === 'PENDING', run: handlers.subletApprove },
      { label: 'Complete', icon: 'task_alt', show: row => role === 'MANAGER' && row['status'] === 'APPROVED', run: handlers.subletComplete }
    ]
  };
}
