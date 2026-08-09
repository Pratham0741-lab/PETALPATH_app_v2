package com.petalpath.camera.filter

import com.petalpath.camera.inference.RawMoveNetKeypoint
import com.petalpath.camera.pose.TrackingState

data class FilteredPose(
    val timestamp: Long,
    val keypoints: List<RawMoveNetKeypoint>,
    val trackingState: TrackingState,
    val trackingDurationMs: Long,
    val confidence: Float,
    val jitterVariance: Float,
    val isPoseDetected: Boolean
)
