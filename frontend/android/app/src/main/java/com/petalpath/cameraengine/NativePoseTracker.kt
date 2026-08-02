package com.petalpath.cameraengine

import android.os.SystemClock
import kotlin.math.roundToInt

enum class TrackingState {
    SEARCHING,
    TRACKING,
    LOST
}

class NativePoseTracker(
    private val visibilityThreshold: Float = 0.5f,
    private val poseLossTimeoutMs: Long = 1000L
) {
    private var currentState: TrackingState = TrackingState.SEARCHING
    private var lastTrackedTimestampMs: Long = 0
    private var currentTrackingId: Long = 0
    private var consecutiveLostFrames: Int = 0

    fun update(landmarks: List<Landmark3D>?, confidence: Float): TrackingResult {
        val now = SystemClock.uptimeMillis()

        if (landmarks != null && landmarks.isNotEmpty() && confidence >= visibilityThreshold) {
            if (currentState == TrackingState.SEARCHING || currentState == TrackingState.LOST) {
                currentTrackingId++
            }
            currentState = TrackingState.TRACKING
            lastTrackedTimestampMs = now
            consecutiveLostFrames = 0

            val smoothedLandmarks = landmarks.map { lm ->
                lm.copy(visibility = Math.max(0.0f, Math.min(1.0f, lm.visibility)))
            }

            // Calculate Pose Quality Score (0-100)
            val avgVisibility = smoothedLandmarks.map { it.visibility }.average().toFloat()
            val trackingStability = Math.max(0.0f, 1.0f - (consecutiveLostFrames * 0.1f))
            val rawQuality = (confidence * 0.4f + avgVisibility * 0.4f + trackingStability * 0.2f) * 100.0f
            val qualityScore = Math.max(0, Math.min(100, rawQuality.roundToInt()))

            return TrackingResult(
                state = currentState,
                landmarks = smoothedLandmarks,
                trackingId = currentTrackingId,
                trackingConfidence = confidence,
                qualityScore = qualityScore
            )
        }

        consecutiveLostFrames++
        val timeSinceLastTrack = now - lastTrackedTimestampMs

        currentState = when {
            lastTrackedTimestampMs == 0L -> TrackingState.SEARCHING
            timeSinceLastTrack > poseLossTimeoutMs -> TrackingState.SEARCHING
            else -> TrackingState.LOST
        }

        return TrackingResult(
            state = currentState,
            landmarks = null,
            trackingId = if (currentState == TrackingState.SEARCHING) 0L else currentTrackingId,
            trackingConfidence = 0.0f,
            qualityScore = 0
        )
    }

    fun reset() {
        currentState = TrackingState.SEARCHING
        lastTrackedTimestampMs = 0
        currentTrackingId = 0
        consecutiveLostFrames = 0
    }
}

data class TrackingResult(
    val state: TrackingState,
    val landmarks: List<Landmark3D>?,
    val trackingId: Long,
    val trackingConfidence: Float,
    val qualityScore: Int
)
