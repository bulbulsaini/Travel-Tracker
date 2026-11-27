
export type Role =
  | "EMPLOYEE"
  | "HOD"
  | "DIRECTOR"
  | "TRAVEL_MANAGER"
  | "ADMIN";

export type TravelType = "INTER_COMPANY" | "OUTSIDE";

export type RequestStatus =
  | "PENDING_HOD"
  | "PENDING_DIRECTOR"
  | "PENDING_TRAVEL_MANAGER"
  | "APPROVED"
  | "REJECTED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  grade?: number;
  plant?: string | null;
  isApproved?: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    travelRequests: number;
  };
}

export interface TravelRequest {
  id: string;
  employeeId: string;
  hodId?: string | null;
  directorId?: string | null;
  travelManagerId?: string | null;

  employeeName: string;
  department: string;

  travelType: TravelType;
  fromLocation: string;
  toLocation: string;
  fromDate: string;
  toDate: string;
  purposeOfVisit: string;

  accommodation: boolean;
  transportMode?: string | null;
  estimatedCost?: number | null;
  additionalNotes?: string | null;

  status: RequestStatus;

  ticketFile?: string | null;
  ticketUploadedAt?: string | null;

  hodComment?: string | null;
  hodApprovedAt?: string | null;

  directorComment?: string | null;
  directorApprovedAt?: string | null;

  travelManagerComment?: string | null;
  travelManagerProcessedAt?: string | null;

  createdAt: string;
  updatedAt?: string;

  employee?: {
    id?: string;
    name: string;
    email: string;
    department: string;
    grade?: number;
    plant?: string | null;
  } | null;

  hod?: {
    id?: string;
    name: string;
  } | null;

  director?: {
    id?: string;
    name: string;
  } | null;

  travelManager?: {
    id?: string;
    name: string;
  } | null;
}

export interface HOD {
  id: string;
  name: string;
  department: string;
  email?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;

  usersByRole: {
    role: Role;
    count: number;
  }[];

  usersGrowthPct: number;
  usersTrend: number[];
  requestsTrend: number[];
}
