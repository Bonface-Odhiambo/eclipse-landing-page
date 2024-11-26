// types/auth.ts
export type UserRole = "writer" | "editor" | "employer" | "admin";

export interface User {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  email_verified: boolean;
  created_at: string;
}