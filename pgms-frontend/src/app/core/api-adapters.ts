import {
  CleaningStatus, LoginResponse, Manager, ManagerSummary, OwnerSummary, PaymentOverview, PaymentSummary,
  PaymentTransaction, PG, Role, Room, RoomStatus, SharingType, Tenant, RentRecord
} from './models';

type AnyRecord = Record<string, unknown>;

const roles: Role[] = ['OWNER', 'MANAGER', 'TENANT'];
const roomStatuses: RoomStatus[] = ['VACANT', 'PARTIAL', 'OCCUPIED', 'SUBLETTING', 'VACATING', 'MAINTENANCE'];
const cleaningStatuses: CleaningStatus[] = ['CLEAN', 'DIRTY', 'IN_PROGRESS'];
const sharingTypes: SharingType[] = ['SINGLE', 'DOUBLE', 'TRIPLE', 'DORM'];
const tenantStatuses = ['ACTIVE', 'VACATING', 'ARCHIVED'] as const;

function isRecord(value: unknown): value is AnyRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function valueAt(source: unknown, keys: string[]): unknown {
  if (!isRecord(source)) return undefined;
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
    if (key.includes('.')) {
      const nested = key.split('.').reduce<unknown>((value, part) => {
        return isRecord(value) ? value[part] : undefined;
      }, source);
      if (nested !== undefined && nested !== null) return nested;
    }
  }
  return undefined;
}

function text(source: unknown, keys: string[], fallback = ''): string {
  const value = valueAt(source, keys);
  return value === undefined || value === null ? fallback : String(value);
}

function numberValue(source: unknown, keys: string[], fallback = 0): number {
  const value = valueAt(source, keys);
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNumber(source: unknown, keys: string[]): number | undefined {
  const value = valueAt(source, keys);
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function booleanValue(source: unknown, keys: string[], fallback = false): boolean {
  const value = valueAt(source, keys);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'yes', 'active'].includes(value.toLowerCase());
  if (typeof value === 'number') return value === 1;
  return fallback;
}

function enumValue<T extends string>(source: unknown, keys: string[], allowed: readonly T[], fallback: T): T {
  const value = text(source, keys, fallback).toUpperCase().replace(/[\s-]+/g, '_');
  return allowed.includes(value as T) ? value as T : fallback;
}

function roomStatus(source: unknown, occupants: Tenant[]): RoomStatus {
  const raw = text(source, ['status', 'roomStatus', 'availabilityStatus'], '').toUpperCase().replace(/[\s-]+/g, '_');
  if (raw === 'AVAILABLE') return 'VACANT';
  if (raw === 'PARTIAL') return occupants.some(tenant => tenant.status === 'VACATING') ? 'VACATING' : 'PARTIAL';
  if (raw === 'FULL') return occupants.some(tenant => tenant.status === 'VACATING') ? 'VACATING' : 'OCCUPIED';
  if (raw === 'MAINTENANCE') return 'MAINTENANCE';
  return roomStatuses.includes(raw as RoomStatus) ? raw as RoomStatus : occupants.length ? 'OCCUPIED' : 'VACANT';
}

export function unwrapApiPayload(response: unknown): unknown {
  if (!isRecord(response)) return response;
  const success = response['success'];
  if (success === false) throw new Error(text(response, ['message', 'error'], 'Request failed'));
  if (response['data'] !== undefined) return response['data'];
  if (response['payload'] !== undefined) return response['payload'];
  if (response['result'] !== undefined) return response['result'];
  return response;
}

export function asCollection(response: unknown): unknown[] {
  const payload = unwrapApiPayload(response);
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  for (const key of ['items', 'content', 'results', 'rows', 'list', 'data']) {
    const nested = payload[key];
    if (Array.isArray(nested)) return nested;
  }
  return [];
}

export function mapLogin(response: unknown): LoginResponse {
  const payload = unwrapApiPayload(response);
  const userSource = valueAt(payload, ['user', 'account', 'profile']) ?? payload;
  const token = text(payload, ['token', 'accessToken', 'jwt', 'bearerToken', 'idToken'], '');
  const role = enumValue(userSource, ['role', 'userRole', 'authority', 'type'], roles, 'OWNER');
  return {
    token,
    role,
    userId: numberValue(userSource, ['userId', 'id', 'accountId'], 0),
    name: text(userSource, ['name', 'fullName', 'username', 'email'], 'StayMate User'),
    isFirstLogin: booleanValue(userSource, ['isFirstLogin', 'firstLogin', 'temporaryPassword', 'passwordChangeRequired'], false)
  };
}

export function mapPg(source: unknown): PG {
  return {
    id: numberValue(source, ['id', 'pgId', 'propertyId']),
    name: text(source, ['name', 'pgName', 'propertyName'], 'Unnamed PG'),
    address: text(source, ['address', 'location', 'fullAddress'], ''),
    totalFloors: numberValue(source, ['totalFloors', 'floors', 'floorCount'], 1),
    paymentDeadlineDay: numberValue(source, ['paymentDeadlineDay', 'rentDueDay', 'deadlineDay'], 5),
    fineAmountPerDay: numberValue(source, ['fineAmountPerDay', 'dailyFine', 'lateFeePerDay'], 0),
    slaHours: numberValue(source, ['slaHours', 'serviceSlaHours'], 48),
    vacantCount: numberValue(source, ['vacantCount', 'vacantRooms'], 0),
    occupiedCount: numberValue(source, ['occupiedCount', 'occupiedRooms'], 0),
    vacatingCount: numberValue(source, ['vacatingCount', 'vacatingRooms'], 0)
  };
}

export function mapRoom(source: unknown): Room {
  const acValue = valueAt(source, ['isAC', 'isAc', 'ac', 'airConditioned']);
  const occupants = [
    ...asCollection(valueAt(source, ['occupants', 'tenants', 'activeTenants', 'residents', 'allocations'])),
    ...asCollection(valueAt(source, ['currentOccupants', 'currentTenants']))
  ].map(mapTenant);
  const singleTenant = valueAt(source, ['tenant', 'currentTenant', 'occupant', 'resident']);
  if (singleTenant) occupants.push(mapTenant(singleTenant));
  const status = roomStatus(source, occupants);

  return {
    id: numberValue(source, ['id', 'roomId']),
    pgId: numberValue(source, ['pgId', 'propertyId', 'pg.id', 'property.id']),
    roomNumber: text(source, ['roomNumber', 'number', 'name', 'roomNo'], 'Room'),
    floor: numberValue(source, ['floor', 'floorNumber'], 0),
    isAC: typeof acValue === 'string' ? acValue.toLowerCase().includes('ac') : booleanValue(source, ['isAC', 'isAc', 'ac', 'airConditioned'], false),
    sharingType: enumValue(source, ['sharingType', 'sharing', 'type', 'occupancyType'], sharingTypes, 'SINGLE'),
    monthlyRent: numberValue(source, ['monthlyRent', 'rent', 'price'], 0),
    depositAmount: optionalNumber(source, ['depositAmount', 'deposit']),
    status,
    cleaningStatus: enumValue(source, ['cleaningStatus', 'housekeepingStatus'], cleaningStatuses, 'CLEAN'),
    capacity: optionalNumber(source, ['capacity', 'beds', 'bedCount']),
    occupants
  };
}

export function mapLayoutRooms(response: unknown, pgId: number): Room[] {
  const payload = unwrapApiPayload(response);
  const floors = asCollection(valueAt(payload, ['floors', 'layoutFloors']));
  if (!floors.length) return asCollection(payload).map(room => ({ ...mapRoom(room), pgId }));

  return floors.flatMap(floor => {
    const floorNumber = numberValue(floor, ['floorNumber', 'floor'], 0);
    return asCollection(valueAt(floor, ['rooms'])).map(room => {
      const mapped = mapRoom(room);
      return {
        ...mapped,
        pgId,
        floor: mapped.floor || floorNumber
      };
    });
  });
}

export function mapTenant(source: unknown): Tenant {
  return {
    tenantProfileId: optionalNumber(source, ['tenantProfileId', 'profileId']),
    userId: numberValue(source, ['userId', 'id', 'tenantId']),
    name: text(source, ['name', 'fullName', 'tenantName'], 'Unnamed tenant'),
    email: text(source, ['email'], ''),
    phone: text(source, ['phone', 'mobile'], ''),
    roomId: numberValue(source, ['roomId', 'room.id', 'allocatedRoomId']),
    roomNumber: text(source, ['roomNumber', 'room.number', 'roomNo'], ''),
    pgId: numberValue(source, ['pgId', 'propertyId', 'pg.id', 'property.id']),
    pgName: text(source, ['pgName', 'pg.name', 'propertyName'], ''),
    joiningDate: text(source, ['joiningDate', 'joinedOn', 'moveInDate'], ''),
    advanceAmountPaid: numberValue(source, ['advanceAmountPaid', 'advance', 'deposit'], 0),
    creditWalletBalance: numberValue(source, ['creditWalletBalance', 'walletBalance', 'credits'], 0),
    status: enumValue(source, ['status', 'tenantStatus'], tenantStatuses, 'ACTIVE'),
    isActive: booleanValue(source, ['isActive', 'active', 'enabled'], true)
  };
}

export function mapManager(source: unknown): Manager {
  return {
    id: numberValue(source, ['id', 'userId', 'managerId']),
    name: text(source, ['name', 'fullName', 'managerName'], 'Unnamed manager'),
    email: text(source, ['email'], ''),
    phone: text(source, ['phone', 'mobile'], ''),
    designation: text(source, ['designation', 'title', 'roleName'], 'Manager'),
    assignedPgs: asCollection(valueAt(source, ['assignedPgs', 'pgs', 'properties'])).map(pg => ({
      id: numberValue(pg, ['id', 'pgId', 'propertyId']),
      name: text(pg, ['name', 'pgName', 'propertyName'], 'PG')
    })),
    isActive: booleanValue(source, ['isActive', 'active', 'enabled'], true)
  };
}

export function mapOwnerSummary(source: unknown): OwnerSummary {
  const payload = unwrapApiPayload(source);
  return {
    totalPgs: numberValue(payload, ['totalPgs', 'pgCount', 'totalProperties'], 0),
    totalRooms: numberValue(payload, ['totalRooms', 'roomCount'], 0),
    totalVacantRooms: numberValue(payload, ['totalVacantRooms', 'vacantRooms'], 0),
    totalActiveTenants: numberValue(payload, ['totalActiveTenants', 'activeTenants'], 0),
    totalVacatingTenants: numberValue(payload, ['totalVacatingTenants', 'vacatingTenants'], 0),
    totalRentCollectedThisMonth: numberValue(payload, ['totalRentCollectedThisMonth', 'rentCollectedThisMonth', 'collectedThisMonth'], 0),
    totalRentPendingThisMonth: numberValue(payload, ['totalRentPendingThisMonth', 'rentPendingThisMonth', 'pendingThisMonth'], 0),
    totalFinesOutstanding: numberValue(payload, ['totalFinesOutstanding', 'finesOutstanding'], 0),
    openComplaints: numberValue(payload, ['openComplaints', 'complaintsOpen'], 0),
    escalatedComplaints: numberValue(payload, ['escalatedComplaints'], 0),
    managerComplaints: numberValue(payload, ['managerComplaints'], 0),
    advanceRefundQueue: asCollection(valueAt(payload, ['advanceRefundQueue', 'refundQueue'])).map(item => ({
      tenantName: text(item, ['tenantName', 'name'], 'Tenant'),
      roomNumber: text(item, ['roomNumber', 'room'], ''),
      advanceRefundAmount: numberValue(item, ['advanceRefundAmount', 'amount'], 0)
    }))
  };
}

export function mapManagerSummary(source: unknown): ManagerSummary {
  const payload = unwrapApiPayload(source);
  return {
    occupancyRate: numberValue(payload, ['occupancyRate', 'occupancyPercentage'], 0),
    totalRooms: numberValue(payload, ['totalRooms', 'roomCount'], 0),
    occupiedRooms: numberValue(payload, ['occupiedRooms'], 0),
    paymentCollectedThisMonth: numberValue(payload, ['paymentCollectedThisMonth', 'collectedThisMonth'], 0),
    paymentPendingThisMonth: numberValue(payload, ['paymentPendingThisMonth', 'pendingThisMonth'], 0),
    openComplaints: numberValue(payload, ['openComplaints', 'complaintsOpen'], 0),
    pendingServiceRequests: numberValue(payload, ['pendingServiceRequests', 'openServiceRequests'], 0),
    vacateNotices: asCollection(valueAt(payload, ['vacateNotices', 'vacatingTenants'])).map(item => ({
      tenantName: text(item, ['tenantName', 'name'], 'Tenant'),
      intendedDate: text(item, ['intendedDate', 'vacateDate', 'date'], ''),
      refundEligible: booleanValue(item, ['refundEligible', 'eligibleForRefund'], false)
    }))
  };
}

export function mapRentRecord(source: unknown): RentRecord {
  return {
    id: numberValue(source, ['id', 'rentRecordId']),
    tenantProfileId: numberValue(source, ['tenantProfileId', 'tenant.id'], 0),
    tenantName: text(source, ['tenantName', 'tenant.name'], 'Tenant'),
    roomNumber: text(source, ['roomNumber', 'room.number', 'roomNo'], ''),
    pgId: optionalNumber(source, ['pgId', 'pg.id', 'propertyId']),
    pgName: text(source, ['pgName', 'pg.name', 'propertyName'], ''),
    billingMonth: text(source, ['billingMonth', 'month'], ''),
    rentAmount: numberValue(source, ['rentAmount', 'rent'], 0),
    ebAmount: numberValue(source, ['ebAmount', 'ebCharge', 'electricityAmount'], 0),
    fineAccrued: numberValue(source, ['fineAccrued', 'fine'], 0),
    amountPaid: numberValue(source, ['amountPaid', 'paidAmount'], 0),
    totalDue: numberValue(source, ['totalDue', 'dueAmount'], 0),
    remainingAmountDue: numberValue(source, ['remainingAmountDue', 'pendingAmount', 'balanceDue'], 0),
    dueDate: text(source, ['dueDate'], ''),
    status: enumValue(source, ['status'], ['PENDING', 'PAID', 'PARTIAL', 'OVERDUE'], 'PENDING'),
    fineWaivedReason: text(source, ['fineWaivedReason'], '')
  };
}

export function mapPaymentTransaction(source: unknown): PaymentTransaction {
  return {
    id: numberValue(source, ['id', 'transactionId']),
    rentRecordId: numberValue(source, ['rentRecordId', 'recordId']),
    tenantProfileId: numberValue(source, ['tenantProfileId', 'tenant.id'], 0),
    tenantName: text(source, ['tenantName', 'tenant.name'], 'Tenant'),
    roomNumber: text(source, ['roomNumber', 'room.number'], ''),
    billingMonth: text(source, ['billingMonth', 'month'], ''),
    transactionType: enumValue(source, ['transactionType', 'type'], ['RENT_CHARGE', 'TENANT_PAYMENT', 'MANAGER_CASH_COLLECTION', 'WALLET_CREDIT_APPLIED', 'FINE_WAIVER', 'LATE_FEE_APPLIED'], 'TENANT_PAYMENT'),
    paymentMethod: enumValue(source, ['paymentMethod', 'method'], ['ONLINE', 'CASH', 'WALLET', 'ADJUSTMENT', 'SYSTEM'], 'ONLINE'),
    amount: numberValue(source, ['amount'], 0),
    signedAmount: numberValue(source, ['signedAmount', 'netAmount'], 0),
    outstandingBefore: numberValue(source, ['outstandingBefore'], 0),
    outstandingAfter: numberValue(source, ['outstandingAfter'], 0),
    walletBalanceBefore: optionalNumber(source, ['walletBalanceBefore']),
    walletBalanceAfter: optionalNumber(source, ['walletBalanceAfter']),
    notes: text(source, ['notes', 'reason', 'description'], ''),
    createdByName: text(source, ['createdByName', 'actorName', 'createdBy.name'], ''),
    createdAt: text(source, ['createdAt', 'timestamp'], '')
  };
}

export function mapPaymentSummary(source: unknown): PaymentSummary {
  const payload = unwrapApiPayload(source);
  return {
    currentBillingMonth: text(payload, ['currentBillingMonth', 'billingMonth'], ''),
    totalRecords: numberValue(payload, ['totalRecords'], 0),
    paidRecords: numberValue(payload, ['paidRecords'], 0),
    partialRecords: numberValue(payload, ['partialRecords'], 0),
    pendingRecords: numberValue(payload, ['pendingRecords'], 0),
    overdueRecords: numberValue(payload, ['overdueRecords'], 0),
    tenantCount: numberValue(payload, ['tenantCount'], 0),
    transactionCount: numberValue(payload, ['transactionCount'], 0),
    totalDue: numberValue(payload, ['totalDue'], 0),
    totalPaid: numberValue(payload, ['totalPaid'], 0),
    totalOutstanding: numberValue(payload, ['totalOutstanding'], 0),
    overdueAmount: numberValue(payload, ['overdueAmount'], 0),
    fineOutstanding: numberValue(payload, ['fineOutstanding'], 0),
    walletBalance: numberValue(payload, ['walletBalance'], 0)
  };
}

export function mapPaymentOverview(source: unknown): PaymentOverview {
  const payload = unwrapApiPayload(source);
  return {
    summary: mapPaymentSummary(valueAt(payload, ['summary']) ?? {}),
    records: asCollection(valueAt(payload, ['records', 'items'])).map(mapRentRecord),
    transactions: asCollection(valueAt(payload, ['transactions', 'ledger', 'history'])).map(mapPaymentTransaction)
  };
}
