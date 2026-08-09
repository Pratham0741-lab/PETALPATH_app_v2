package com.petalpath.camera.pose

import com.petalpath.camera.inference.RawMoveNetKeypoint

data class TrackedPose(
    val timestamp: Long,
    val keypoints: List<RawMoveNetKeypoint>,
    val trackingState: TrackingState,
    val trackingDurationMs: Long,
    val confidence: Float,
    val isPoseDetected: Boolean
)
