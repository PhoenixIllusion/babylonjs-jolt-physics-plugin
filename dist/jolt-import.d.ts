import Jolt from 'jolt-physics';
export function setJoltModule(joltModule?: (target?: any) => Promise<typeof Jolt>): Promise<void>;
export function loadJolt<T>(_importSettings: any): Promise<void>;
export default Jolt;