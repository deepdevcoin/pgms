import { Role } from '../../core/models';
import { ActionConfig, ModuleConfig, ModuleKey } from './operations.types';

export interface OperationsActionHandlers {
  payRent: (row: Record<string, any>) => void;
  applyCredit: (row: Record<string, any>) => void;
  waiveFine: (row: Record<string, any>) => void;
  complaintInProgress: (row: Record<string, any>) => void;
  complaintEscalate: (row: Record<string, any>) => void;
  complaintResolve: (row: Record<string, any>) => void;
  complaintClose: (row: Record<string, any>) => void;
  complaintComment: (row: Record<string, any>) => void;
  complaintTimeline: (row: Record<string, any>) => void;
  noticeMarkRead: (row: Record<string, any>) => void;
  noticeReceipts: (row: Record<string, any>) => void;
  vacateApprove: (row: Record<string, any>) => void;
  vacateReject: (row: Record<string, any>) => void;
  vacateCheckout: (row: Record<string, any>) => void;
  serviceConfirm: (row: Record<string, any>) => void;
  serviceStart: (row: Record<string, any>) => void;
  serviceComplete: (row: Record<string, any>) => void;
  serviceReject: (row: Record<string, any>) => void;
  serviceRate: (row: Record<string, any>) => void;
  amenityBook: (row: Record<string, any>) => void;
  amenityOpenInvite: (row: Record<string, any>) => void;
  amenityJoin: (row: Record<string, any>) => void;
  amenityCancel: (row: Record<string, any>) => void;
  amenityDeleteSlot: (row: Record<string, any>) => void;
  subletApprove: (row: Record<string, any>) => void;
  subletUnapprove: (row: Record<string, any>) => void;
  subletReject: (row: Record<string, any>) => void;
  subletDelete: (row: Record<string, any>) => void;
  subletCheckIn: (row: Record<string, any>) => void;
  subletCheckout: (row: Record<string, any>) => void;
}

const serviceTypeLabels: Record<string, string> = {
  CLEANING: 'Room cleaning',
  LINEN_CHANGE: 'Linen change',
  PEST_CONTROL: 'Pest control',
  PLUMBING: 'Plumbing',
  ELECTRICAL: 'Electrical'
};

const serviceTimeWindowOptions = [
  '6:00 AM - 8:00 AM',
  '8:00 AM - 10:00 AM',
  '10:00 AM - 12:00 PM',
  '12:00 PM - 2:00 PM',
  '2:00 PM - 4:00 PM',
  '4:00 PM - 6:00 PM',
  '6:00 PM - 8:00 PM',
  '8:00 PM - 10:00 PM',
  'Flexible'
];

function serviceTypeLabel(option: string): string {
  return serviceTypeLabels[option] || option;
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
      columns: role === 'TENANT'
        ? ['id', 'roomNumber', 'category', 'status', 'createdAt', 'details']
        : ['id', 'tenantName', 'roomNumber', 'category', 'status', 'createdAt', 'details'],
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
      subtitle: role === 'TENANT'
        ? 'Submit and track your vacate request. The vacate date must be at least 15 days from today.'
        : 'Manage vacate notices, referrals and checkout.',
      columns: ['tenantName', 'roomNumber', 'intendedVacateDate', 'status', 'refundEligible', 'advanceRefundAmount', 'referralName', 'managerMessage'],
      createLabel: role === 'TENANT' ? 'Request vacate' : undefined,
      fields: role === 'TENANT' ? [
        { key: 'intendedVacateDate', label: 'Vacate date (15+ days)', type: 'date' },
        { key: 'hasReferral', label: 'Has referral', type: 'checkbox' },
        { key: 'referralName', label: 'Referral name', type: 'text' },
        { key: 'referralPhone', label: 'Referral phone', type: 'text' },
        { key: 'referralEmail', label: 'Referral email', type: 'text' }
      ] : []
    },
    services: {
      crumb: 'Operations',
      title: 'Service Bookings',
      subtitle: role === 'TENANT'
        ? 'Request housekeeping and maintenance support with clear timing and follow-through.'
        : 'Triage requests, coordinate visits, and move work forward without extra friction.',
      columns: role === 'TENANT'
        ? ['serviceType', 'preferredDate', 'preferredTimeWindow', 'status', 'createdAt', 'serviceSummary', 'rating']
        : ['tenantName', 'pgName', 'roomNumber', 'serviceType', 'preferredDate', 'preferredTimeWindow', 'status', 'serviceSummary', 'rating'],
      createLabel: role === 'TENANT' ? 'Book service' : undefined,
      fields: role === 'TENANT' ? [
        { key: 'serviceType', label: 'Service type', type: 'select', options: ['CLEANING', 'LINEN_CHANGE', 'PEST_CONTROL', 'PLUMBING', 'ELECTRICAL'], optionLabel: serviceTypeLabel },
        { key: 'preferredDate', label: 'Preferred date', type: 'date' },
        { key: 'preferredTimeWindow', label: 'Preferred time window', type: 'select', options: serviceTimeWindowOptions },
        { key: 'requestNotes', label: 'Request details', type: 'textarea', wide: true }
      ] : []
    },
    amenities: {
      crumb: 'Bookings',
      title: 'Amenities',
      subtitle: role === 'TENANT'
        ? 'Reserve machines for personal use or join hosted game sessions in your PG.'
        : 'Publish amenity availability as machine units or shared sessions and manage upcoming slots.',
      columns: role === 'TENANT'
        ? ['facilityName', 'amenityType', 'slotDate', 'startTime', 'endTime', 'capacity', 'bookingCount']
        : ['pgId', 'slotDate', 'startTime', 'endTime', 'amenityType', 'resourceName', 'facilityName', 'capacity', 'bookingCount'],
      createLabel: role === 'MANAGER' ? 'Create slot' : undefined,
      fields: role === 'MANAGER' ? [
        { key: 'pgId', label: 'PG', type: 'select', options: pgOptions, optionLabel: option => pgName(option) },
        { key: 'amenityType', label: 'Amenity', type: 'select', options: ['WASHING_MACHINE', 'TABLE_TENNIS', 'CARROM', 'BADMINTON'] },
        { key: 'facilityName', label: 'Location', type: 'text' },
        { key: 'slotDate', label: 'Date', type: 'date' },
        { key: 'startTime', label: 'Start', type: 'time' },
        { key: 'endTime', label: 'End', type: 'time' },
        { key: 'capacity', label: 'Units / seats', type: 'number' }
      ] : []
    },
    menu: {
      crumb: '',
      title: '',
      subtitle: '',
      columns: ['pgId', 'dayOfWeek', 'mealType', 'itemNames', 'isVeg'],
      fields: []
    },
    sublets: {
      crumb: 'Credits',
      title: 'Sublets',
      subtitle: role === 'TENANT' ? 'Request a temporary sublet and earn wallet credit.' : 'Approve sublets and complete guest checkout.',
      columns: role === 'TENANT'
        ? ['roomNumber', 'startDate', 'endDate', 'status', 'guestName', 'checkInDate', 'checkOutDate', 'walletCreditAmount']
        : ['tenantName', 'pgName', 'roomNumber', 'startDate', 'endDate', 'status', 'guestName', 'guestPhone', 'guestRecordStatus', 'checkInDate', 'checkOutDate'],
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
      { label: 'In progress', icon: 'hourglass_top', show: row => role !== 'TENANT' && (row['status'] === 'OPEN' || row['status'] === 'ESCALATED'), run: handlers.complaintInProgress },
      { label: 'Escalate', icon: 'priority_high', show: row => role === 'MANAGER' && (row['status'] === 'OPEN' || row['status'] === 'IN_PROGRESS'), run: handlers.complaintEscalate },
      { label: 'Resolve', icon: 'task_alt', show: row => role !== 'TENANT' && row['status'] !== 'RESOLVED' && row['status'] !== 'CLOSED', run: handlers.complaintResolve },
      { label: role === 'TENANT' ? 'Follow up' : 'Add note', icon: 'comment', show: () => true, run: handlers.complaintComment },
      { label: 'Timeline', icon: 'history', show: () => true, run: handlers.complaintTimeline },
      { label: 'Close', icon: 'check_circle', show: row => role !== 'TENANT' && row['status'] === 'RESOLVED', run: handlers.complaintClose }
    ],
	    notices: [
	      { label: 'Mark read', icon: 'done_all', show: row => role === 'TENANT' && !row['read'], run: handlers.noticeMarkRead },
	      { label: 'View views', icon: 'visibility', show: () => role !== 'TENANT', run: handlers.noticeReceipts }
	    ],
    vacate: [
      { label: 'Approve referral', icon: 'how_to_reg', show: row => role === 'MANAGER' && row['referralName'] && row['status'] === 'REFERRAL_PENDING', run: handlers.vacateApprove },
      { label: 'Reject', icon: 'person_remove', show: row => role === 'MANAGER' && row['status'] !== 'COMPLETED' && row['status'] !== 'REJECTED', run: handlers.vacateReject },
      { label: 'Checkout', icon: 'logout', show: row => role === 'MANAGER' && row['status'] !== 'COMPLETED' && row['status'] !== 'REFERRAL_PENDING', run: handlers.vacateCheckout }
    ],
    services: [
      { label: 'Confirm', icon: 'event_available', show: row => role === 'MANAGER' && row['status'] === 'REQUESTED', run: handlers.serviceConfirm },
      { label: 'Start', icon: 'play_circle', show: row => role === 'MANAGER' && row['status'] === 'CONFIRMED', run: handlers.serviceStart },
      { label: 'Complete', icon: 'task_alt', show: row => role === 'MANAGER' && row['status'] === 'IN_PROGRESS', run: handlers.serviceComplete },
      { label: 'Reject', icon: 'cancel', show: row => role === 'MANAGER' && (row['status'] === 'REQUESTED' || row['status'] === 'CONFIRMED'), run: handlers.serviceReject },
      { label: 'Rate', icon: 'star', show: row => role === 'TENANT' && row['status'] === 'COMPLETED' && !row['rating'], run: handlers.serviceRate }
    ],
	    amenities: [
	      { label: 'Book', icon: 'event', show: row => role === 'TENANT' && !row['bookingId'] && !row['shareable'], run: handlers.amenityBook },
	      { label: 'Host session', icon: 'groups', show: row => role === 'TENANT' && !row['bookingId'] && !!row['shareable'] && !row['hostName'], run: handlers.amenityOpenInvite },
	      { label: 'Join', icon: 'group_add', show: row => role === 'TENANT' && !!row['joinable'], run: handlers.amenityJoin },
	      { label: 'Cancel', icon: 'event_busy', show: row => role === 'TENANT' && row['bookingId'], run: handlers.amenityCancel },
	      { label: 'Delete', icon: 'delete', show: row => role === 'MANAGER' && Number(row['bookingCount'] || 0) === 0, run: handlers.amenityDeleteSlot }
	    ],
    menu: [],
    sublets: [
      { label: 'Delete', icon: 'delete', show: row => role === 'TENANT' && row['status'] === 'PENDING', run: handlers.subletDelete },
      { label: 'Approve', icon: 'check_circle', show: row => role === 'MANAGER' && row['status'] === 'PENDING', run: handlers.subletApprove },
      { label: 'Unapprove', icon: 'undo', show: row => role === 'MANAGER' && row['status'] === 'APPROVED', run: handlers.subletUnapprove },
      { label: 'Disapprove', icon: 'cancel', show: row => role === 'MANAGER' && row['status'] === 'PENDING', run: handlers.subletReject },
      { label: 'Check in', icon: 'login', show: row => role === 'MANAGER' && row['status'] === 'APPROVED', run: handlers.subletCheckIn },
      { label: 'Checkout', icon: 'logout', show: row => role === 'MANAGER' && row['status'] === 'ACTIVE', run: handlers.subletCheckout }
    ]
  };
}
