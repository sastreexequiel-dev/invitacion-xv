export type RsvpStatus = "pending" | "confirmed" | "declined";

/** Datos que la página pública conoce de UN invitado (solo los suyos) */
export type PublicGuest = {
  code: string;
  name: string;
  maxCompanions: number;
  status: RsvpStatus;
  companions: number;
  comment: string | null;
  respondedAt: string | null;
};

/** Registro completo (solo panel de administración) */
export type GuestRow = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  notes: string | null;
  max_companions: number;
  status: RsvpStatus;
  companions: number;
  comment: string | null;
  source: "admin" | "open";
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};
