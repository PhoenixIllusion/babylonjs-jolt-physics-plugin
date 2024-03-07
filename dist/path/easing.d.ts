import { IEasingFunction } from '@babylonjs/core/Animations/easing';
export declare enum EasingMethod {
    LINEAR = 0,
    SINE = 1,
    QUADRATIC = 2,
    CUBIC = 3,
    QUARTIC = 4,
    QUINTIC = 5,
    EXPONENTIAL = 6,
    CIRCLE = 7,
    BACK = 8,
    ELASTIC = 9,
    BOUNCE = 10
}
export declare function getEasing(easing: EasingMethod): IEasingFunction;
