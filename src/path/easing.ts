import { BackEase, BounceEase, CircleEase, CubicEase, EasingFunction, ElasticEase, ExponentialEase, IEasingFunction, QuadraticEase, QuarticEase, QuinticEase, SineEase } from '@babylonjs/core/Animations/easing';

const LinearEase = class extends EasingFunction { ease(gradient: number) { return gradient; } };

export enum EasingMethod {
  LINEAR,
  SINE,
  QUADRATIC,
  CUBIC,
  QUARTIC,
  QUINTIC,
  EXPONENTIAL,
  CIRCLE,
  BACK,
  ELASTIC,
  BOUNCE
}

type EasingMethodHash = { [key in EasingMethod]: { new(): EasingFunction } }

const EASE_METHODS: EasingMethodHash = {
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
}

export function getEasing(easing: EasingMethod): IEasingFunction {
  let easeClass: { new(): EasingFunction } | undefined = EASE_METHODS[easing];
  if (!easeClass) {
    easeClass = LinearEase;
  }
  const ease = new easeClass();
  ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
  return ease;
}
