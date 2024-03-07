import { BackEase, BounceEase, CircleEase, CubicEase, EasingFunction, ElasticEase, ExponentialEase, QuadraticEase, QuarticEase, QuinticEase, SineEase } from '@babylonjs/core/Animations/easing';
const LinearEase = class extends EasingFunction {
    ease(gradient) { return gradient; }
};
export var EasingMethod;
(function (EasingMethod) {
    EasingMethod[EasingMethod["LINEAR"] = 0] = "LINEAR";
    EasingMethod[EasingMethod["SINE"] = 1] = "SINE";
    EasingMethod[EasingMethod["QUADRATIC"] = 2] = "QUADRATIC";
    EasingMethod[EasingMethod["CUBIC"] = 3] = "CUBIC";
    EasingMethod[EasingMethod["QUARTIC"] = 4] = "QUARTIC";
    EasingMethod[EasingMethod["QUINTIC"] = 5] = "QUINTIC";
    EasingMethod[EasingMethod["EXPONENTIAL"] = 6] = "EXPONENTIAL";
    EasingMethod[EasingMethod["CIRCLE"] = 7] = "CIRCLE";
    EasingMethod[EasingMethod["BACK"] = 8] = "BACK";
    EasingMethod[EasingMethod["ELASTIC"] = 9] = "ELASTIC";
    EasingMethod[EasingMethod["BOUNCE"] = 10] = "BOUNCE";
})(EasingMethod || (EasingMethod = {}));
const EASE_METHODS = {
    [EasingMethod.SINE]: SineEase,
    [EasingMethod.LINEAR]: LinearEase,
    [EasingMethod.QUADRATIC]: QuadraticEase,
    [EasingMethod.CUBIC]: CubicEase,
    [EasingMethod.QUARTIC]: QuarticEase,
    [EasingMethod.QUINTIC]: QuinticEase,
    [EasingMethod.EXPONENTIAL]: ExponentialEase,
    [EasingMethod.CIRCLE]: CircleEase,
    [EasingMethod.BACK]: BackEase,
    [EasingMethod.ELASTIC]: ElasticEase,
    [EasingMethod.BOUNCE]: BounceEase
};
export function getEasing(easing) {
    let easeClass = EASE_METHODS[easing];
    if (!easeClass) {
        easeClass = LinearEase;
    }
    const ease = new easeClass();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    return ease;
}
