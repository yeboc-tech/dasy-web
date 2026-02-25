const DEFAULT_SECONDS_PER_PROBLEM = 90;

export class TimeLimitCalculator {
  static calculate(problemCount: number, customTimeLimitS?: number | null): number {
    if (customTimeLimitS) return customTimeLimitS;
    return problemCount * DEFAULT_SECONDS_PER_PROBLEM;
  }
}
