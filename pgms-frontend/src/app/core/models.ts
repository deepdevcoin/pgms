export type Role = 'OWNER' | 'MANAGER' | 'TENANT';

export type RoomStatus = 'VACANT' | 'OCCUPIED' | 'SUBLETTING' | 'VACATING';
export type SharingType = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'DORM';

export interface LoginResponse {
  token: string;
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

export interface Room {
  id: number;
  pgId: number;
  roomNumber: string;
  floor: number;
  isAC: boolean;
  sharingType: SharingType;
  monthlyRent: number;
  status: RoomStatus;
  occupants?: Tenant[];
  capacity?: number;
}

export interface Tenant {
  userId: number;
  name: string;
  email?: string;
  phone?: string;
  roomId?: number;
  pgId?: number;
  joiningDate?: string;
  advanceAmountPaid?: number;
  creditWalletBalance?: number;
  status?: 'ACTIVE' | 'VACATING' | 'ARCHIVED';
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
  paymentCollectedThisMonth: number;
  paymentPendingThisMonth: number;
  openComplaints: number;
  pendingServiceRequests: number;
  vacateNotices: { tenantName: string; intendedDate: string; refundEligible: boolean }[];
}