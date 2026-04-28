export type Role = 'OWNER' | 'MANAGER' | 'TENANT';
export type KycStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'REPLACEMENT_REQUESTED' | 'VERIFIED';

export type RoomStatus = 'VACANT' | 'PARTIAL' | 'OCCUPIED' | 'SUBLETTING' | 'VACATING' | 'MAINTENANCE';
export type CleaningStatus = 'CLEAN' | 'DIRTY' | 'IN_PROGRESS';
export type SharingType = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'DORM';
export type RoomMutableStatus = Exclude<RoomStatus, 'PARTIAL'>;

export interface LoginResponse {
  token?: string;
  role: Role;
  userId: number;
  name: string;
  isFirstLogin: boolean;
}

export interface BaseResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface PG {
  id: number;
  name: string;
  address: string;
  totalFloors: number;
  paymentDeadlineDay: number;
  fineAmountPerDay: number;
  slaHours: number;
  vacantCount: number;
  occupiedCount: number;
  vacatingCount: number;
}

export interface PgCreatePayload {
  name: string;
  address: string;
  totalFloors: number;
  paymentDeadlineDay: number;
  fineAmountPerDay: number;
  slaHours: number;
}

export interface PgUpdatePayload extends PgCreatePayload {}

export interface RoomCreatePayload {
  roomNumber: string;
  floor: number;
  isAC: boolean;
  sharingType: SharingType;
  monthlyRent: number;
  depositAmount: number;
  status: RoomMutableStatus;
  cleaningStatus: CleaningStatus;
}

export interface RoomUpdatePayload {
  roomNumber?: string;
  floor?: number;
  isAC?: boolean;
  sharingType?: SharingType;
  monthlyRent?: number;
  depositAmount?: number;
  status?: RoomMutableStatus;
  cleaningStatus?: CleaningStatus;
}

export interface Room {
  id: number;
  pgId: number;
  roomNumber: string;
  floor: number;
  isAC: boolean;
  sharingType: SharingType;
  monthlyRent: number;
  depositAmount?: number;
  status: RoomStatus;
  cleaningStatus?: CleaningStatus;
  occupants?: Tenant[];
  capacity?: number;
}

export interface Tenant {
  tenantProfileId?: number;
  userId: number;
  name: string;
  email?: string;
  phone?: string;
  roomId?: number;
  roomNumber?: string;
  pgId?: number;
  pgName?: string;
  joiningDate?: string;
  advanceAmountPaid?: number;
  kycDocType?: string;
  kycDocPath?: string;
  kycStatus?: KycStatus;
  kycSubmittedAt?: string;
  kycVerifiedAt?: string;
  kycVerifiedByName?: string;
  kycReplacementNotes?: string;
  kycReplacementRequestedAt?: string;
  kycReplacementRequestedByName?: string;
  creditWalletBalance?: number;
  status?: 'ACTIVE' | 'VACATING' | 'ARCHIVED';
  isActive?: boolean;
}

export interface Manager {
  id: number;
  name: string;
  email: string;
  phone: string;
  designation: string;
  assignedPgs: { id: number; name: string }[];
  isActive: boolean;
}

export interface OwnerSummary {
  totalPgs: number;
  totalRooms: number;
  totalVacantRooms: number;
  totalActiveTenants: number;
  totalVacatingTenants: number;
  totalRentCollectedThisMonth: number;
  totalRentPendingThisMonth: number;
  totalFinesOutstanding: number;
  openComplaints: number;
  escalatedComplaints: number;
  managerComplaints: number;
  advanceRefundQueue: { tenantName: string; roomNumber: string; advanceRefundAmount: number }[];
}

export interface ManagerSummary {
  occupancyRate: number;
  totalRooms: number;
  occupiedRooms: number;
  occupiedBeds?: number;
  totalBeds?: number;
  paymentCollectedThisMonth: number;
  paymentPendingThisMonth: number;
  openComplaints: number;
  pendingServiceRequests: number;
  vacateNotices: { tenantName: string; intendedDate: string; refundEligible: boolean }[];
}

export type RentStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE';
export type PaymentMethod = 'ONLINE' | 'CASH' | 'WALLET' | 'ADJUSTMENT' | 'SYSTEM';
export type PaymentTransactionType = 'RENT_CHARGE' | 'TENANT_PAYMENT' | 'MANAGER_CASH_COLLECTION' | 'WALLET_CREDIT_APPLIED' | 'FINE_WAIVER' | 'LATE_FEE_APPLIED';
export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED' | 'CLOSED';
export type ComplaintCategory = 'MAINTENANCE' | 'NOISE' | 'HYGIENE' | 'FOOD' | 'OTHER' | 'AGAINST_MANAGER';
export type ComplaintActivityType = 'CREATED' | 'COMMENT' | 'STATUS_CHANGE';
export type VacateStatus = 'PENDING' | 'REFERRAL_PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export type ServiceStatus = 'REQUESTED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
export type ServiceType = 'CLEANING' | 'LINEN_CHANGE' | 'PEST_CONTROL' | 'PLUMBING' | 'ELECTRICAL';
export type AmenityType = 'WASHING_MACHINE' | 'TABLE_TENNIS' | 'CARROM' | 'BADMINTON' | 'CUSTOM';
export type BookingStatus = 'AVAILABLE' | 'BOOKED' | 'CANCELLED' | 'COMPLETED';
export type SubletStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED';
export type NoticeTargetType = 'ALL_PGS' | 'SPECIFIC_PG' | 'ALL_MANAGERS' | 'SPECIFIC_TENANT';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER';

export interface RentRecord {
  id: number;
  tenantProfileId: number;
  tenantName: string;
  roomNumber: string;
  pgId?: number;
  pgName?: string;
  billingMonth: string;
  rentAmount: number;
  ebAmount?: number;
  fineAccrued: number;
  amountPaid: number;
  totalDue: number;
  remainingAmountDue: number;
  dueDate?: string;
  status: RentStatus;
  fineWaivedReason?: string;
}

export interface PaymentSummary {
  currentBillingMonth: string;
  totalRecords: number;
  paidRecords: number;
  partialRecords: number;
  pendingRecords: number;
  overdueRecords: number;
  tenantCount: number;
  transactionCount: number;
  totalDue: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueAmount: number;
  fineOutstanding: number;
  walletBalance: number;
}

export interface PaymentTransaction {
  id: number;
  rentRecordId: number;
  tenantProfileId: number;
  tenantName: string;
  roomNumber: string;
  billingMonth: string;
  transactionType: PaymentTransactionType;
  paymentMethod: PaymentMethod;
  amount: number;
  signedAmount: number;
  outstandingBefore: number;
  outstandingAfter: number;
  walletBalanceBefore?: number;
  walletBalanceAfter?: number;
  notes?: string;
  createdByName?: string;
  createdAt: string;
}

export interface PaymentOverview {
  summary: PaymentSummary;
  records: RentRecord[];
  transactions: PaymentTransaction[];
}

export interface Complaint {
  id: number;
  tenantProfileId?: number;
  tenantName?: string;
  roomNumber?: string;
  category: ComplaintCategory;
  description: string;
  attachmentPath?: string;
  status: ComplaintStatus;
  notes?: string;
   latestActivitySummary?: string;
   activityCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ComplaintActivity {
  id: number;
  activityType: ComplaintActivityType;
  actorRole?: Role;
  actorName?: string;
  fromStatus?: ComplaintStatus;
  toStatus?: ComplaintStatus;
  message?: string;
  createdAt?: string;
}

export interface Notice {
  id: number;
  title: string;
  content: string;
  targetType: NoticeTargetType;
  targetPgId?: number;
  targetUserId?: number;
  createdByName?: string;
  createdAt?: string;
  read?: boolean;
  readCount?: number;
}

export interface NoticeReadReceipt {
  userId: number;
  userName: string;
  role: Role;
  readAt: string;
}

export interface WalletCreditEntry {
  subletRequestId: number;
  roomNumber?: string;
  startDate?: string;
  endDate?: string;
  checkInDate?: string;
  checkOutDate?: string;
  occupiedDays?: number;
  roomMonthlyRent?: number;
  creditedAmount: number;
  creditedAt?: string;
  note?: string;
}

export interface WalletInfo {
  creditWalletBalance: number;
  credits: WalletCreditEntry[];
}

export interface VacateNotice {
  id: number;
  tenantProfileId?: number;
  tenantName?: string;
  roomNumber?: string;
  intendedVacateDate: string;
  noticeType?: string;
  status: VacateStatus;
  refundEligible?: boolean;
  advanceRefundAmount?: number;
  referralName?: string;
  referralPhone?: string;
  referralEmail?: string;
  managerMessage?: string;
}

export interface ServiceBooking {
  id: number;
  tenantProfileId?: number;
  tenantName?: string;
  pgId?: number;
  pgName?: string;
  roomNumber?: string;
  serviceType: ServiceType;
  preferredDate: string;
  preferredTimeWindow?: string;
  requestNotes?: string;
  status: ServiceStatus;
  managerNotes?: string;
  rating?: number;
  ratingComment?: string;
  createdAt?: string;
  updatedAt?: string;
  confirmedAt?: string;
  startedAt?: string;
  completedAt?: string;
  rejectedAt?: string;
}

export interface AmenityBooking {
  bookingId?: number;
  slotId: number;
  configId?: number;
  pgId?: number;
  tenantName?: string;
  hostName?: string;
  bookedByName?: string;
  amenityType: AmenityType;
  displayName?: string;
  facilityName?: string;
  resourceName?: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
  generationDays?: number;
  bookingCount?: number;
  openInvite?: boolean;
  joinable?: boolean;
  shareable?: boolean;
  enabled?: boolean;
  maintenanceMode?: boolean;
  status?: BookingStatus;
}

export interface AmenityControl {
  id: number;
  pgId: number;
  amenityType: AmenityType;
  displayName: string;
  resourceName: string;
  facilityName: string;
  unitCount: number;
  capacity: number;
  slotDurationMinutes: number;
  startTime: string;
  endTime: string;
  enabled: boolean;
  maintenanceMode: boolean;
  upcomingOpenSlots: number;
  upcomingBookedSlots: number;
}

export interface MenuItem {
  id?: number;
  pgId: number;
  weekLabel?: string;
  dayOfWeek: string;
  mealType: MealType;
  itemNames: string;
  isVeg: boolean;
}

export interface SubletRequest {
  id: number;
  tenantProfileId?: number;
  tenantName?: string;
  pgId?: number;
  pgName?: string;
  roomNumber?: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: SubletStatus;
  guestName?: string;
  guestPhone?: string;
  checkInDate?: string;
  checkOutDate?: string;
  subletGuestId?: number;
  guestRecordStatus?: 'ACTIVE' | 'CHECKED_OUT';
  managerDecisionNote?: string;
  walletCreditDays?: number;
  walletCreditAmount?: number;
  walletCreditedAt?: string;
}
