export interface EndToEndMetrics {
  nativeInferenceMs: number;
  bridgeLatencyMs: number;
  evaluationMs: number;
  totalRoundtripMs: number;
}

export class PoseDiagnostics {
  private static instance: PoseDiagnostics | null = null;
  private lastMetrics: EndToEndMetrics = {
    nativeInferenceMs: 0,
    bridgeLatencyMs: 0,
    evaluationMs: 0,
    totalRoundtripMs: 0,
  };

  public static getInstance(): PoseDiagnostics {
    if (!PoseDiagnostics.instance) {
      PoseDiagnostics.instance = new PoseDiagnostics();
    }
    return PoseDiagnostics.instance;
  }

  public recordFrameEvaluation(
    nativeTimestamp: number,
    nativeInferenceMs: number,
    evalStartTimeMs: number,
    evalEndTimeMs: number
  ): EndToEndMetrics {
    const jsReceiveTimeMs = Date.now();
    const bridgeLatencyMs = Math.max(0, jsReceiveTimeMs - nativeTimestamp);
    const evaluationMs = Math.max(0, evalEndTimeMs - evalStartTimeMs);
    const totalRoundtripMs = nativeInferenceMs + bridgeLatencyMs + evaluationMs;

    this.lastMetrics = {
      nativeInferenceMs,
      bridgeLatencyMs,
      evaluationMs,
      totalRoundtripMs,
    };

    return this.lastMetrics;
  }

  public getMetrics(): EndToEndMetrics {
    return { ...this.lastMetrics };
  }
}

export const poseDiagnostics = PoseDiagnostics.getInstance();
