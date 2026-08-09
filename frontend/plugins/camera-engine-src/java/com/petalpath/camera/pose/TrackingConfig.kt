package com.petalpath.camera.pose

data class TrackingConfig(
    val acquisitionConfidenceThreshold: Float = 0.25f,
    val minConfidenceThreshold: Float = 0.18f,
    val lostFrameCountThreshold: Int = 10,
    val recoveryFrameCountThreshold: Int = 3,
    val confidenceDecayRate: Float = 0.95f
)
