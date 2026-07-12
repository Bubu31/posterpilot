import { json } from '@sveltejs/kit';
import { MaintenanceModeError, maintenanceMode } from './maintenance';

export function maintenanceResponse(): Response | null {
	return maintenanceMode() ? json({ error: { code: 'maintenance_mode' } }, { status: 503 }) : null;
}

export function maintenanceErrorResponse(error: unknown): Response | null {
	return error instanceof MaintenanceModeError
		? json({ error: { code: error.code } }, { status: 503 })
		: null;
}
