export interface SafeCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: string;
}

export interface AuthResponse {
  customer: SafeCustomer;
  token: string;
}
