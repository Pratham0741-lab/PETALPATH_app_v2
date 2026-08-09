package com.petalpath.camera.pose

import com.petalpath.camera.inference.InferenceResult
import com.petalpath.camera.diagnostics.StructuredLogger

class PoseTracker(private val config: TrackingConfig = TrackingConfig()) {

    var currentState: TrackingState = TrackingState.SEARCHING
        private set

    private var trackingStartTimeMs: Long = 0L
    private var consecutiveLostFrames: Int = 0
    private var consecutiveRecoveryFrames: Int = 0
    private var smoothedConfidence: Float = 0f

    val totalPoseLosses = java.util.concurrent.atomic.AtomicLong(0)
    val totalRecoveries = java.util.concurrent.atomic.AtomicLong(0)

    @Synchronized
    fun update(inferenceResult: InferenceResult?): TrackedPose {
        val timestamp = System.currentTimeMillis()

        if (inferenceResult == null || inferenceResult.overallConfidence < config.minConfidenceThreshold) {
            handleMissingOrLowConfidence(timestamp)
            return TrackedPose(
                timestamp = timestamp,
                keypoints = inferenceResult?.keypoints ?: emptyList(),
                trackingState = currentState,
                trackingDurationMs = getTrackingDuration(timestamp),
                confidence = smoothedConfidence,
                isPoseDetected = false
            )
        }

        val rawConfidence = inferenceResult.overallConfidence
        smoothedConfidence = if (smoothedConfidence == 0f) rawConfidence else (smoothedConfidence * 0.7f + rawConfidence * 0.3f)

        when (currentState) {
            TrackingState.SEARCHING -> {
                if (rawConfidence >= config.acquisitionConfidenceThreshold) {
                    currentState = TrackingState.TRACKING
                    trackingStartTimeMs = timestamp
                    consecutiveLostFrames = 0
                    consecutiveRecoveryFrames = 0
                    StructuredLogger.log("PoseTracker", 0, "POSE_ACQUIRED", "Acquired pose with confidence $rawConfidence")
                }
            }

            TrackingState.TRACKING -> {
                consecutiveLostFrames = 0
            }

            TrackingState.LOST -> {
                if (rawConfidence >= config.acquisitionConfidenceThreshold) {
                    currentState = TrackingState.RECOVERING
                    consecutiveRecoveryFrames = 1
                }
            }

            TrackingState.RECOVERING -> {
                if (rawConfidence >= config.acquisitionConfidenceThreshold) {
                    consecutiveRecoveryFrames++
                    if (consecutiveRecoveryFrames >= config.recoveryFrameCountThreshold) {
                        currentState = TrackingState.TRACKING
                        totalRecoveries.incrementAndGet()
                        consecutiveLostFrames = 0
                        StructuredLogger.log("PoseTracker", 0, "POSE_RECOVERED", "Successfully recovered tracking after occlusion")
                    }
                } else {
                    currentState = TrackingState.LOST
                    consecutiveRecoveryFrames = 0
                }
            }
        }

        return TrackedPose(
            timestamp = timestamp,
            keypoints = inferenceResult.keypoints,
            trackingState = currentState,
            trackingDurationMs = getTrackingDuration(timestamp),
            confidence = smoothedConfidence,
            isPoseDetected = true
        )
    }

    private fun handleMissingOrLowConfidence(timestamp: Long) {
        smoothedConfidence *= config.confidenceDecayRate
        consecutiveLostFrames++

        when (currentState) {
            TrackingState.TRACKING, TrackingState.RECOVERING -> {
                if (consecutiveLostFrames >= config.lostFrameCountThreshold) {
                    currentState = TrackingState.LOST
                    totalPoseLosses.incrementAndGet()
                    trackingStartTimeMs = 0L
                    StructuredLogger.warn("PoseTracker", "POSE_LOST", "Lost pose after $consecutiveLostFrames missed frames")
                }
            }
            TrackingState.LOST, TrackingState.SEARCHING -> {
                if (consecutiveLostFrames >= config.lostFrameCountThreshold * 2) {
                    currentState = TrackingState.SEARCHING
                    smoothedConfidence = 0f
                }
            }
        }
    }

    private fun getTrackingDuration(nowMs: Long): Long {
        return if (trackingStartTimeMs > 0L && (currentState == TrackingState.TRACKING || currentState == TrackingState.RECOVERING)) {
            nowMs - trackingStartTimeMs
        } else {
            0L
        }
    }

    fun reset() {
        currentState = TrackingState.SEARCHING
        trackingStartTimeMs = 0L
        consecutiveLostFrames = 0
        consecutiveRecoveryFrames = 0
        smoothedConfidence = 0f
    }
}
