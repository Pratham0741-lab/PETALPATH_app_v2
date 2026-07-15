export function retentionPercentage(
  stability: number,
  elapsedDays: number,
  retentionDecayPower: number,
): number {
  if (stability <= 0) return 100;
  const normalizedTime = elapsedDays / stability;
  return 100 * Math.exp(-(normalizedTime ** retentionDecayPower));
}
