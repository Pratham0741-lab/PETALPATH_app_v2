package com.petalpath.camera.filter

import com.petalpath.camera.inference.RawMoveNetKeypoint
import com.petalpath.camera.pose.TrackedPose

class EMAFilter(private val alpha: Float = 0.35f) : IMotionFilter {

    private val smoothedX = FloatArray(17)
    private val smoothedY = FloatArray(17)
    private var isInitialized = false
    private var lastJitterVariance = 0f

    @Synchronized
    override fun filter(trackedPose: TrackedPose): FilteredPose {
        if (!trackedPose.isPoseDetected || trackedPose.keypoints.isEmpty()) {
            return FilteredPose(
                timestamp = trackedPose.timestamp,
                keypoints = trackedPose.keypoints,
                trackingState = trackedPose.trackingState,
                trackingDurationMs = trackedPose.trackingDurationMs,
                confidence = trackedPose.confidence,
                jitterVariance = 0f,
                isPoseDetected = false
            )
        }

        val filteredKeypoints = mutableListOf<RawMoveNetKeypoint>()
        var varianceAccumulator = 0f

        for (kp in trackedPose.keypoints) {
            val idx = kp.index
            if (idx !in 0 until 17) {
                filteredKeypoints.add(kp)
                continue
            }

            if (!isInitialized) {
                smoothedX[idx] = kp.x
                smoothedY[idx] = kp.y
            } else {
                val dx = kp.x - smoothedX[idx]
                val dy = kp.y - smoothedY[idx]
                varianceAccumulator += (dx * dx + dy * dy)

                smoothedX[idx] = alpha * kp.x + (1f - alpha) * smoothedX[idx]
                smoothedY[idx] = alpha * kp.y + (1f - alpha) * smoothedY[idx]
            }

            filteredKeypoints.add(
                RawMoveNetKeypoint(
                    index = idx,
                    x = smoothedX[idx],
                    y = smoothedY[idx],
                    score = kp.score
                )
            )
        }

        isInitialized = true
        lastJitterVariance = if (trackedPose.keypoints.isNotEmpty()) Math.sqrt((varianceAccumulator / trackedPose.keypoints.size).toDouble()).toFloat() else 0f

        return FilteredPose(
            timestamp = trackedPose.timestamp,
            keypoints = filteredKeypoints,
            trackingState = trackedPose.trackingState,
            trackingDurationMs = trackedPose.trackingDurationMs,
            confidence = trackedPose.confidence,
            jitterVariance = lastJitterVariance,
            isPoseDetected = true
        )
    }

    @Synchronized
    override fun reset() {
        isInitialized = false
        lastJitterVariance = 0f
        for (i in 0 until 17) {
            smoothedX[i] = 0f
            smoothedY[i] = 0f
        }
    }
}
