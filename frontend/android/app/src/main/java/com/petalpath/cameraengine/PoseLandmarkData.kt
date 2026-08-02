package com.petalpath.cameraengine

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

enum class DebugLevel {
    OFF,
    BASIC,
    PERFORMANCE,
    LANDMARKS,
    FULL
}

data class Landmark3D(
    val x: Float,
    val y: Float,
    val z: Float,
    val visibility: Float = 0.9f
)

data class PipelineStageTimings(
    val captureTimeMs: Long = 0,
    val mediaPipeTimeMs: Long = 0,
    val trackerTimeMs: Long = 0,
    val calibrationTimeMs: Long = 0,
    val filterTimeMs: Long = 0,
    val bridgeEmitTimeMs: Long = 0
) {
    fun toWritableMap(): WritableMap {
        val map = Arguments.createMap()
        map.putDouble("captureTimeMs", captureTimeMs.toDouble())
        map.putDouble("mediaPipeTimeMs", mediaPipeTimeMs.toDouble())
        map.putDouble("trackerTimeMs", trackerTimeMs.toDouble())
        map.putDouble("calibrationTimeMs", calibrationTimeMs.toDouble())
        map.putDouble("filterTimeMs", filterTimeMs.toDouble())
        map.putDouble("bridgeEmitTimeMs", bridgeEmitTimeMs.toDouble())
        return map
    }
}

data class PoseMetrics(
    val cameraFPS: Int = 0,
    val processingFPS: Int = 0,
    val inferenceTimeMs: Long = 0,
    val droppedFrames: Int = 0,
    val queueDepth: Int = 0,
    val cpuUsage: Float = 0.0f,
    val gpuUsage: Float = 0.0f,
    val trackingConfidence: Float = 0.0f,
    val stageTimings: PipelineStageTimings = PipelineStageTimings()
)

data class CalibrationData(
    val scaleFactor: Float = 1.0f,
    val isCalibrated: Boolean = false,
    val shoulderWidth: Float = 0.0f,
    val estimatedArmSpan: Float = 0.0f,
    val postureMode: String = "standing",
    val cameraDistanceEstimate: Float = 1.5f,
    val childHeightEstimate: Float = 1.0f
)

data class EngineConfig(
    var trackingEnabled: Boolean = true,
    var calibrationEnabled: Boolean = true,
    var filterType: String = "ema",
    var gpuEnabled: Boolean = true,
    var maxFPS: Int = 30,
    var debugLevel: DebugLevel = DebugLevel.BASIC
)

data class PoseResultV1(
    val version: String = "v1",
    val timestamp: Long = System.currentTimeMillis(),
    val trackingState: String = "searching",
    val confidence: Float = 0.0f,
    val qualityScore: Int = 0, // 0 to 100
    val trackingId: Long = 0L,
    val metrics: PoseMetrics = PoseMetrics(),
    val calibration: CalibrationData = CalibrationData(),
    val landmarks: List<Landmark3D>? = null
) {
    fun toWritableMap(debugLevel: DebugLevel): WritableMap {
        val map = Arguments.createMap()
        val isDetected = trackingState == "tracking" && !landmarks.isNullOrEmpty()
        val lCount = landmarks?.size ?: 0

        map.putString("version", version)
        map.putDouble("timestamp", timestamp.toDouble())
        map.putBoolean("poseDetected", isDetected)
        map.putString("trackingState", trackingState)
        map.putDouble("confidence", confidence.toDouble())
        map.putInt("qualityScore", qualityScore)
        map.putDouble("trackingId", trackingId.toDouble())
        map.putInt("landmarkCount", lCount)

        if (debugLevel != DebugLevel.OFF) {
            val metricsMap = Arguments.createMap()
            metricsMap.putInt("cameraFPS", metrics.cameraFPS)
            metricsMap.putInt("processingFPS", metrics.processingFPS)
            metricsMap.putDouble("inferenceTimeMs", metrics.inferenceTimeMs.toDouble())
            metricsMap.putInt("droppedFrames", metrics.droppedFrames)
            metricsMap.putInt("queueDepth", metrics.queueDepth)
            metricsMap.putDouble("cpuUsage", metrics.cpuUsage.toDouble())
            metricsMap.putDouble("gpuUsage", metrics.gpuUsage.toDouble())
            metricsMap.putDouble("trackingConfidence", metrics.trackingConfidence.toDouble())

            if (debugLevel == DebugLevel.PERFORMANCE || debugLevel == DebugLevel.FULL) {
                metricsMap.putMap("stageTimings", metrics.stageTimings.toWritableMap())
            }

            map.putMap("metrics", metricsMap)

            val calMap = Arguments.createMap()
            calMap.putDouble("scaleFactor", calibration.scaleFactor.toDouble())
            calMap.putBoolean("isCalibrated", calibration.isCalibrated)
            calMap.putDouble("shoulderWidth", calibration.shoulderWidth.toDouble())
            calMap.putDouble("estimatedArmSpan", calibration.estimatedArmSpan.toDouble())
            calMap.putString("postureMode", calibration.postureMode)
            calMap.putDouble("cameraDistanceEstimate", calibration.cameraDistanceEstimate.toDouble())
            calMap.putDouble("childHeightEstimate", calibration.childHeightEstimate.toDouble())
            map.putMap("calibration", calMap)
        }

        // Always attach landmarks array whenever present so JS ActivityEngine can evaluate keypoints
        if (landmarks != null && landmarks.isNotEmpty()) {
            val listArray = Arguments.createArray()
            for (lm in landmarks) {
                val lmMap = Arguments.createMap()
                lmMap.putDouble("x", lm.x.toDouble())
                lmMap.putDouble("y", lm.y.toDouble())
                lmMap.putDouble("z", lm.z.toDouble())
                lmMap.putDouble("visibility", lm.visibility.toDouble())
                listArray.pushMap(lmMap)
            }
            map.putArray("landmarks", listArray)
        }

        return map
    }
}
