package com.petalpath.camera.calibration

data class CalibrationData(
    val bodyScale: Float = 1.0f,
    val shoulderWidth: Float = 0.0f,
    val armLength: Float = 0.0f,
    val torsoLength: Float = 0.0f,
    val posture: String = "UNKNOWN", // "STANDING", "SITTING", "UNKNOWN"
    val estimatedDistanceMeters: Float = 1.5f,
    val calibrationConfidence: Float = 0.0f, // 0.0 (WARMING_UP) to 1.0 (STABILIZED)
    val status: String = "WARMING_UP" // "WARMING_UP" or "STABILIZED"
)
