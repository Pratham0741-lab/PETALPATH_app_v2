package com.petalpath.cameraengine

import kotlin.math.abs
import kotlin.math.sqrt

class NativeCalibrationEngine {
    private var isCalibrated = false
    private var baselineScale = 1.0f

    fun calibrate(landmarks: List<Landmark3D>): CalibrationData {
        if (landmarks.size < 25) {
            return CalibrationData(
                scaleFactor = 1.0f,
                isCalibrated = false,
                shoulderWidth = 0.0f,
                estimatedArmSpan = 0.0f,
                postureMode = "standing",
                cameraDistanceEstimate = 1.5f,
                childHeightEstimate = 1.0f
            )
        }

        // Landmarks: 11 (left shoulder), 12 (right shoulder), 15 (left wrist), 16 (right wrist), 23 (left hip), 24 (right hip), 27 (left ankle), 28 (right ankle)
        val leftShoulder = landmarks[11]
        val rightShoulder = landmarks[12]
        val leftWrist = landmarks[15]
        val rightWrist = landmarks[16]
        val leftHip = landmarks[23]
        val rightHip = landmarks[24]
        val leftAnkle = landmarks[27]
        val rightAnkle = landmarks[28]

        // 1. Shoulder width
        val sDx = leftShoulder.x - rightShoulder.x
        val sDy = leftShoulder.y - rightShoulder.y
        val shoulderWidth = sqrt(sDx * sDx + sDy * sDy)

        // 2. Arm span
        val aDx = leftWrist.x - rightWrist.x
        val aDy = leftWrist.y - rightWrist.y
        val estimatedArmSpan = sqrt(aDx * aDx + aDy * aDy)

        // 3. Posture mode (sitting vs standing based on hip-to-ankle vertical distance)
        val hipAvgY = (leftHip.y + rightHip.y) / 2.0f
        val ankleAvgY = (leftAnkle.y + rightAnkle.y) / 2.0f
        val legVerticalDiff = abs(ankleAvgY - hipAvgY)
        val postureMode = if (legVerticalDiff < 0.25f) "sitting" else "standing"

        // 4. Camera distance & child height estimates
        val cameraDistance = if (shoulderWidth > 0.01f) 0.35f / shoulderWidth else 1.5f
        val childHeightEstimate = if (shoulderWidth > 0.01f) (shoulderWidth * 3.8f) else 1.0f

        if (shoulderWidth > 0.05f) {
            baselineScale = 0.25f / shoulderWidth
            isCalibrated = true
        }

        return CalibrationData(
            scaleFactor = baselineScale,
            isCalibrated = isCalibrated,
            shoulderWidth = shoulderWidth,
            estimatedArmSpan = estimatedArmSpan,
            postureMode = postureMode,
            cameraDistanceEstimate = cameraDistance,
            childHeightEstimate = childHeightEstimate
        )
    }

    fun reset() {
        isCalibrated = false
        baselineScale = 1.0f
    }
}
