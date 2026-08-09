package com.petalpath.camera.calibration

import com.petalpath.camera.filter.FilteredPose
import com.petalpath.camera.inference.RawMoveNetKeypoint

class CalibrationEngine {

    private var frameCount = 0
    private var accumShoulderWidth = 0f
    private var accumTorsoLength = 0f
    private var accumArmLength = 0f
    private var currentData = CalibrationData()

    @Synchronized
    fun process(filteredPose: FilteredPose): CalibratedPose {
        if (!filteredPose.isPoseDetected || filteredPose.keypoints.isEmpty()) {
            return CalibratedPose(filteredPose, currentData)
        }

        val keypointMap = filteredPose.keypoints.associateBy { it.index }

        val lShoulder = keypointMap[5]
        val rShoulder = keypointMap[6]
        val lElbow = keypointMap[7]
        val rElbow = keypointMap[8]
        val lWrist = keypointMap[9]
        val rWrist = keypointMap[10]
        val lHip = keypointMap[11]
        val rHip = keypointMap[12]
        val lKnee = keypointMap[13]
        val rKnee = keypointMap[14]

        if (lShoulder != null && rShoulder != null && lShoulder.score > 0.3f && rShoulder.score > 0.3f) {
            val sw = dist(lShoulder, rShoulder)
            accumShoulderWidth = if (accumShoulderWidth == 0f) sw else (accumShoulderWidth * 0.9f + sw * 0.1f)
        }

        if (lShoulder != null && lHip != null && lShoulder.score > 0.3f && lHip.score > 0.3f) {
            val tl = dist(lShoulder, lHip)
            accumTorsoLength = if (accumTorsoLength == 0f) tl else (accumTorsoLength * 0.9f + tl * 0.1f)
        }

        if (lShoulder != null && lElbow != null && lWrist != null && lShoulder.score > 0.3f && lElbow.score > 0.3f && lWrist.score > 0.3f) {
            val al = dist(lShoulder, lElbow) + dist(lElbow, lWrist)
            accumArmLength = if (accumArmLength == 0f) al else (accumArmLength * 0.9f + al * 0.1f)
        }

        frameCount++
        val confidence = Math.min(1.0f, frameCount / 20.0f)
        val status = if (confidence >= 0.8f) "STABILIZED" else "WARMING_UP"

        // Determine posture
        var posture = "UNKNOWN"
        if (lHip != null && lKnee != null && lHip.score > 0.3f && lKnee.score > 0.3f) {
            val dy = Math.abs(lKnee.y - lHip.y)
            val dx = Math.abs(lKnee.x - lHip.x)
            posture = if (dy > dx * 1.2f) "STANDING" else "SITTING"
        }

        // Estimate distance in meters based on shoulder width (approx 0.35m average child shoulder width)
        val distance = if (accumShoulderWidth > 0.01f) (0.35f / accumShoulderWidth) else 1.5f

        currentData = CalibrationData(
            bodyScale = if (accumTorsoLength > 0f) accumTorsoLength * 2.5f else 1.0f,
            shoulderWidth = accumShoulderWidth,
            armLength = accumArmLength,
            torsoLength = accumTorsoLength,
            posture = posture,
            estimatedDistanceMeters = distance,
            calibrationConfidence = confidence,
            status = status
        )

        return CalibratedPose(filteredPose, currentData)
    }

    private fun dist(p1: RawMoveNetKeypoint, p2: RawMoveNetKeypoint): Float {
        val dx = p1.x - p2.x
        val dy = p1.y - p2.y
        return Math.sqrt((dx * dx + dy * dy).toDouble()).toFloat()
    }

    fun reset() {
        frameCount = 0
        accumShoulderWidth = 0f
        accumTorsoLength = 0f
        accumArmLength = 0f
        currentData = CalibrationData()
    }
}
