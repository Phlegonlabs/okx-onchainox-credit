import packageJson from '../../../../package.json';

export interface HealthStatusPayload {
  status: 'ok';
  uptime: number;
  version: string;
}

export function getHealthStatusPayload(
  getUptime: () => number = () => process.uptime(),
  version = packageJson.version
): HealthStatusPayload {
  return {
    status: 'ok',
    uptime: Math.floor(getUptime()),
    version,
  };
}
