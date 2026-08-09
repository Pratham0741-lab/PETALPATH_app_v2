package com.petalpath.camera.inference

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.petalpath.camera.calibration.CalibratedPose
import com.petalpath.camera.pose.EvaluationResult

object PoseFrameMapper {

    private val KEYPOINT_NAMES = arrayOf(
        "nose", "left_eye", "right_eye", "left_ear", "right_ear",
        "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
        "left_wrist", "right_wrist", "left_hip", "right_hip",
        "left_knee", "right_knee", "left_ankle", "right_ankle"
    )

    /**
     * Maps fully processed CalibratedPose + EvaluationResult into PoseFrameV1 WritableMap payload.
     */
    fun mapToPoseFrameV1Map(
        calibratedPose: CalibratedPose,
        evaluationResult: EvaluationResult,
        inferenceTimeMs: Long
    ): WritableMap {
        val filtered = calibratedPose.filteredPose
        val calib = calibratedPose.calibrationData

        val frameMap = Arguments.createMap()
        frameMap.putInt("version", 1)
        frameMap.putDouble("timestamp", filtered.timestamp.toDouble())
        frameMap.putDouble("inferenceTime", inferenceTimeMs.toDouble())
        frameMap.putDouble("confidence", filtered.confidence.toDouble())
        frameMap.putInt("qualityScore", evaluationResult.qualityScore)
        frameMap.putInt("stabilityScore", evaluationResult.stabilityScore)
        frameMap.putString("trackingState", filtered.trackingState.name)
        frameMap.putString("errorCode", evaluationResult.errorCode)

        val calibMap = Arguments.createMap()
        calibMap.putDouble("bodyScale", calib.bodyScale.toDouble())
        calibMap.putDouble("shoulderWidth", calib.shoulderWidth.toDouble())
        calibMap.putDouble("armLength", calib.armLength.toDouble())
        calibMap.putDouble("torsoLength", calib.torsoLength.toDouble())
        calibMap.putString("posture", calib.posture)
        calibMap.putDouble("estimatedDistanceMeters", calib.estimatedDistanceMeters.toDouble())
        calibMap.putDouble("calibrationConfidence", calib.calibrationConfidence.toDouble())
        calibMap.putString("status", calib.status)
        frameMap.putMap("calibration", calibMap)

        val keypointArray = Arguments.createArray()
        for (kp in filtered.keypoints) {
            val kpMap = Arguments.createMap()
            val name = if (kp.index in KEYPOINT_NAMES.indices) KEYPOINT_NAMES[kp.index] else "keypoint_${kp.index}"
            kpMap.putInt("index", kp.index)
            kpMap.putString("name", name)
            kpMap.putDouble("x", kp.x.toDouble())
            kpMap.putDouble("y", kp.y.toDouble())
            kpMap.putDouble("score", kp.score.toDouble())
            keypointArray.pushMap(kpMap)
        }

        frameMap.putArray("keypoints", keypointArray)
        return frameMap
    }
}
