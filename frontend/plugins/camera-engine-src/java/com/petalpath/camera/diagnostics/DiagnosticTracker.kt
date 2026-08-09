package com.petalpath.camera.diagnostics

import com.petalpath.camera.state.CameraState
import java.util.concurrent.atomic.AtomicLong

class DiagnosticTracker {
    val framesReceived = AtomicLong(0)
    val framesProcessed = AtomicLong(0)
    val framesDropped = AtomicLong(0)

    @Volatile var queueDepth: Int = 0
    @Volatile var cameraState: String = CameraState.UNINITIALIZED.name
    @Volatile var modelState: String = "UNLOADED"
    @Volatile var interpreterState: String = "UNINITIALIZED"
    @Volatile var delegateType: String = "GPU"

    @Volatile var lastInferenceTimeMs: Long = 0L
    @Volatile var averageInferenceMs: Double = 0.0
    @Volatile var peakInferenceMs: Long = 0L

    @Volatile var lastTrackingMs: Long = 0L
    @Volatile var lastFilteringMs: Long = 0L
    @Volatile var lastCalibrationMs: Long = 0L
    @Volatile var lastEvaluationMs: Long = 0L
    @Volatile var lastMappingMs: Long = 0L

    @Volatile var currentQualityScore: Int = 0
    @Volatile var currentStabilityScore: Int = 0
    @Volatile var currentTrackingState: String = "SEARCHING"
    @Volatile var currentPosture: String = "UNKNOWN"
    @Volatile var poseLossesCount: Long = 0L
    @Volatile var recoveriesCount: Long = 0L

    private val inferenceTimes = SynchronizedRingBuffer(30)
    private var lastFpsCalculationTime = System.currentTimeMillis()
    private var framesInLastSecond = 0
    @Volatile var currentCameraFps: Double = 0.0
    @Volatile var currentInferenceFps: Double = 0.0

    @Volatile var activeWatchdogAlert: String? = null

    fun recordFrameReceived() {
        framesReceived.incrementAndGet()
        framesInLastSecond++
        val now = System.currentTimeMillis()
        val elapsed = now - lastFpsCalculationTime
        if (elapsed >= 1000) {
            currentCameraFps = (framesInLastSecond * 1000.0) / elapsed
            framesInLastSecond = 0
            lastFpsCalculationTime = now
            checkWatchdogThresholds()
        }
    }

    fun recordInference(durationMs: Long) {
        framesProcessed.incrementAndGet()
        lastInferenceTimeMs = durationMs
        if (durationMs > peakInferenceMs) {
            peakInferenceMs = durationMs
        }
        inferenceTimes.add(durationMs.toDouble())
        averageInferenceMs = inferenceTimes.average()
        currentInferenceFps = if (averageInferenceMs > 0) Math.min(30.0, 1000.0 / averageInferenceMs) else 0.0
    }

    fun recordPoseProcessingStage(
        trackingMs: Long,
        filteringMs: Long,
        calibrationMs: Long,
        evaluationMs: Long,
        mappingMs: Long,
        qualityScore: Int,
        stabilityScore: Int,
        trackingState: String,
        posture: String,
        poseLosses: Long,
        recoveries: Long
    ) {
        lastTrackingMs = trackingMs
        lastFilteringMs = filteringMs
        lastCalibrationMs = calibrationMs
        lastEvaluationMs = evaluationMs
        lastMappingMs = mappingMs
        currentQualityScore = qualityScore
        currentStabilityScore = stabilityScore
        currentTrackingState = trackingState
        currentPosture = posture
        poseLossesCount = poseLosses
        recoveriesCount = recoveries
    }

    fun recordFrameDropped() {
        framesDropped.incrementAndGet()
        checkWatchdogThresholds()
    }

    private fun checkWatchdogThresholds() {
        val totalReceived = framesReceived.get()
        val totalDropped = framesDropped.get()
        val dropRate = if (totalReceived > 20) (totalDropped.toDouble() / totalReceived.toDouble()) else 0.0

        activeWatchdogAlert = when {
            dropRate > 0.25 -> "HIGH_FRAME_DROP_RATE: ${(dropRate * 100).toInt()}% dropped"
            averageInferenceMs > 45.0 -> "HIGH_INFERENCE_LATENCY: ${averageInferenceMs.toInt()}ms"
            currentCameraFps > 0 && currentCameraFps < 15.0 -> "LOW_CAMERA_FPS: ${currentCameraFps.toInt()} FPS"
            else -> null
        }

        activeWatchdogAlert?.let { alert ->
            StructuredLogger.warn("Watchdog", "ALERT", alert)
        }
    }

    fun getMetricsMap(): Map<String, Any> {
        val totalAllocated = Runtime.getRuntime().totalMemory()
        val freeMemory = Runtime.getRuntime().freeMemory()
        val usedMemoryMb = (totalAllocated - freeMemory) / (1024 * 1024)

        return mapOf(
            "framesReceived" to framesReceived.get(),
            "framesProcessed" to framesProcessed.get(),
            "framesDropped" to framesDropped.get(),
            "queueDepth" to queueDepth,
            "cameraState" to cameraState,
            "modelState" to modelState,
            "interpreterState" to interpreterState,
            "delegateType" to delegateType,
            "lastInferenceMs" to lastInferenceTimeMs,
            "averageInferenceMs" to averageInferenceMs,
            "peakInferenceMs" to peakInferenceMs,
            "trackingMs" to lastTrackingMs,
            "filteringMs" to lastFilteringMs,
            "calibrationMs" to lastCalibrationMs,
            "evaluationMs" to lastEvaluationMs,
            "mappingMs" to lastMappingMs,
            "qualityScore" to currentQualityScore,
            "stabilityScore" to currentStabilityScore,
            "trackingState" to currentTrackingState,
            "posture" to currentPosture,
            "poseLosses" to poseLossesCount,
            "recoveries" to recoveriesCount,
            "cameraFps" to currentCameraFps,
            "inferenceFps" to currentInferenceFps,
            "usedMemoryMb" to usedMemoryMb,
            "watchdogAlert" to (activeWatchdogAlert ?: "NORMAL")
        )
    }

    private class SynchronizedRingBuffer(private val capacity: Int) {
        private val buffer = DoubleArray(capacity)
        private var head = 0
        private var count = 0

        @Synchronized
        fun add(value: Double) {
            buffer[head] = value
            head = (head + 1) % capacity
            if (count < capacity) count++
        }

        @Synchronized
        fun average(): Double {
            if (count == 0) return 0.0
            var sum = 0.0
            for (i in 0 until count) {
                sum += buffer[i]
            }
            return sum / count
        }
    }
}
