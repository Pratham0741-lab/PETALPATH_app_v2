package com.petalpath.camera.pose

import com.petalpath.camera.calibration.CalibratedPose

data class EvaluationResult(
    val qualityScore: Int, // 0 to 100
    val stabilityScore: Int, // 0 to 100
    val errorCode: String // "OK", "NO_PERSON_DETECTED", "LOW_CONFIDENCE", "TRACKING_LOST", etc.
)

class PoseQualityEvaluator {

    fun evaluate(calibratedPose: CalibratedPose): EvaluationResult {
        val filtered = calibratedPose.filteredPose
        val calib = calibratedPose.calibrationData

        if (!filtered.isPoseDetected || filtered.keypoints.isEmpty()) {
            return EvaluationResult(0, 0, "NO_PERSON_DETECTED")
        }

        if (filtered.trackingState == TrackingState.LOST) {
            return EvaluationResult(0, 0, "TRACKING_LOST")
        }

        // Quality score calculation based on confidence and landmark visibility
        val avgConfidence = filtered.confidence
        val visibleKeypointsCount = filtered.keypoints.count { it.score > 0.25f }
        val visibilityRatio = visibleKeypointsCount.toFloat() / 17f

        var rawQuality = (avgConfidence * 60f) + (visibilityRatio * 40f)
        val qualityScore = Math.max(0, Math.min(100, rawQuality.toInt()))

        // Stability score based on jitter variance
        var rawStability = 100f - (filtered.jitterVariance * 1200f)
        val stabilityScore = Math.max(0, Math.min(100, rawStability.toInt()))

        val errorCode = when {
            qualityScore < 30 -> "LOW_CONFIDENCE"
            visibilityRatio < 0.4f -> "LOW_VISIBILITY"
            filtered.trackingState == TrackingState.RECOVERING -> "TRACKING_UNSTABLE"
            calib.status == "WARMING_UP" -> "CALIBRATION_PENDING"
            else -> "OK"
        }

        return EvaluationResult(
            qualityScore = qualityScore,
            stabilityScore = stabilityScore,
            errorCode = errorCode
        )
    }
}
