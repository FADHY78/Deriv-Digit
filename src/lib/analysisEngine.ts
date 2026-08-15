import type { FrequencyData, DeviationScore, StreakInfo, SignalSummary, TickData } from '../types/deriv';

/**
 * Extracts the last digit from a tick quote given pipSize or decimal representation.
 */
export function extractLastDigit(quote: number, pipSize: number = 2): number {
  const formatted = quote.toFixed(pipSize);
  const lastChar = formatted.charAt(formatted.length - 1);
  const parsed = parseInt(lastChar, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Pure statistical function computing digit frequency counts and percentages (0-9)
 * over a specified window size.
 */
export function computeFrequencyTable(ticks: TickData[], windowSize: number = 100): FrequencyData[] {
  const slice = ticks.slice(-windowSize);
  const total = slice.length;

  const counts: number[] = new Array(10).fill(0);
  for (const tick of slice) {
    if (tick.lastDigit >= 0 && tick.lastDigit <= 9) {
      counts[tick.lastDigit]++;
    }
  }

  const result: FrequencyData[] = [];
  for (let digit = 0; digit <= 9; digit++) {
    const count = counts[digit];
    const percentage = total > 0 ? (count / total) * 100 : 0;
    const deviation = percentage - 10.0; // Expected baseline for 10 digits is 10.0%

    result.push({
      digit,
      count,
      percentage: Number(percentage.toFixed(2)),
      deviation: Number(deviation.toFixed(2)),
    });
  }

  return result;
}

/**
 * Computes deviation scores relative to the expected 10% uniform distribution baseline.
 */
export function computeDeviationScores(
  frequencyTable: FrequencyData[],
  threshold: number = 3.0
): DeviationScore[] {
  return frequencyTable.map((freq) => ({
    digit: freq.digit,
    score: freq.deviation,
    isHot: freq.deviation >= threshold,
    isCold: freq.deviation <= -threshold,
  }));
}

/**
 * Computes the number of ticks elapsed since each digit (0-9) last appeared.
 */
export function computeStreaks(ticks: TickData[]): StreakInfo[] {
  const streaks: StreakInfo[] = [];

  for (let digit = 0; digit <= 9; digit++) {
    let ticksSince = 0;
    let found = false;

    // Scan backwards from most recent tick
    for (let i = ticks.length - 1; i >= 0; i--) {
      if (ticks[i].lastDigit === digit) {
        found = true;
        break;
      }
      ticksSince++;
    }

    streaks.push({
      digit,
      ticksSinceLast: found ? ticksSince : ticks.length,
    });
  }

  return streaks;
}

/**
 * Computes heuristic signals based purely on statistical deviation and streak length.
 * IMPORTANT: These are descriptive statistical metrics, NOT future predictions.
 */
export function computeSignals(
  deviationScores: DeviationScore[],
  streaks: StreakInfo[],
  threshold: number = 3.0
): SignalSummary[] {
  return deviationScores.map((dev) => {
    const streak = streaks.find((s) => s.digit === dev.digit)?.ticksSinceLast ?? 0;
    
    let status: 'HOT' | 'COLD' | 'NEUTRAL' = 'NEUTRAL';
    if (dev.score >= threshold) {
      status = 'HOT';
    } else if (dev.score <= -threshold) {
      status = 'COLD';
    }

    // Purely statistical confidence score (0-100) reflecting distance from 10% baseline
    const absoluteDeviation = Math.abs(dev.score);
    const confidence = Math.min(Math.round((absoluteDeviation / (threshold * 2)) * 100), 100);

    return {
      digit: dev.digit,
      deviation: dev.score,
      streak,
      status,
      signalConfidence: confidence,
    };
  });
}
