import { query } from './db';

export async function logAudit(params: {
  userId: string | null;
  action: string;
  entite: string;
  entiteId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  await query(
    `INSERT INTO audit_logs (user_id, action, entite, entite_id, details, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      params.userId,
      params.action,
      params.entite,
      params.entiteId || null,
      params.details ? JSON.stringify(params.details) : null,
      params.ipAddress || null,
      params.userAgent || null,
    ]
  );
}
