export const SESSION_COOKIE = "fl_admin_session";
export const PENDING_2FA_COOKIE = "fl_admin_pending_2fa";
export const MOCK_2FA_CODE = "123456";

export interface MockAdminAccount {
  id: string;
  email: string;
  password: string;
  name: string;
}

export const MOCK_ADMIN_ACCOUNT: MockAdminAccount = {
  id: "adm-001",
  email: "admin@founderlink.co.ke",
  password: "admin123",
  name: "Wanjiku Kamau",
};
