import Jolt from 'jolt-physics';
export const setJoltModule = async (joltModule?: (target?: any)=> Promise<typeof Jolt>) => Promise<void>;
export const loadJolt = async <T>(_importSettings: any) => Promise<void>;
export default Jolt;