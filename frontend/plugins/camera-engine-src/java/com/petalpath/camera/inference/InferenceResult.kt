package com.petalpath.camera.inference

/**
 * Raw output keypoint from MoveNet model before application mapping.
 */
data class RawMoveNetKeypoint(
    val index: Int,
    val x: Float, // Normalized [0.0, 1.0]
    val y: Float, // Normalized [0.0, 1.0]
    val score: Float
)

/**
 * Encapsulates output from MoveNet inference execution.
 */
data class InferenceResult(
    val timestamp: Long,
    val keypoints: List<RawMoveNetKeypoint>,
    val inferenceTimeMs: Long,
    val overallConfidence: Float
)
