import Jolt from "../jolt-import";
import { JoltConstraint } from './types';
export declare function createJoltConstraint(mainBody: Jolt.Body, connectedBody: Jolt.Body, constraintParams: JoltConstraint): Jolt.Constraint | undefined;
