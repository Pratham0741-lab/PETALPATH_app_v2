package com.petalpath.camera.camera

import androidx.camera.core.ImageProxy
import com.petalpath.camera.calibration.CalibrationEngine
import com.petalpath.camera.diagnostics.DiagnosticTracker
import com.petalpath.camera.filter.EMAFilter
import com.petalpath.camera.inference.IInferenceEngine
import com.petalpath.camera.inference.PoseFrameMapper
import com.petalpath.camera.pose.PoseQualityEvaluator
import com.petalpath.camera.pose.PoseTracker
import com.petalpath.camera.preprocessing.YuvToByteBufferConverter
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class FrameDispatcher(
    private val inferenceEngine: IInferenceEngine,
    val diagnosticTracker: DiagnosticTracker,
    private val onFrameProcessedListener: (com.facebook.react.bridge.WritableMap) -> Unit
) {

    private val executor = Executors.newSingleThreadExecutor()
    private val isBusy = AtomicBoolean(false)
    private val converter = YuvToByteBufferConverter(192, 192)

    val poseTracker = PoseTracker()
    val motionFilter = EMAFilter(0.35f)
    val calibrationEngine = CalibrationEngine()
    val qualityEvaluator = PoseQualityEvaluator()

    fun dispatchFrame(imageProxy: ImageProxy, rotationDegrees: Int, isFrontCamera: Boolean) {
        diagnosticTracker.recordFrameReceived()

        if (!isBusy.compareAndSet(false, true)) {
            diagnosticTracker.recordFrameDropped()
            imageProxy.close()
            return
        }

        diagnosticTracker.queueDepth = 1

        executor.execute {
            val startTimeMs = System.currentTimeMillis()
            try {
                // 1. Preprocessing (Zero-bitmap YUV to RGB conversion)
                val rgbBuffer = converter.convertYuvToRgbBuffer(imageProxy, rotationDegrees, isFrontCamera)

                // 2. TFLite Model Inference
                val t0 = System.currentTimeMillis()
                val inferenceResult = inferenceEngine.processFrame(rgbBuffer, startTimeMs)
                val inferenceMs = System.currentTimeMillis() - t0

                // 3. Pose Tracking State Machine
                val t1 = System.currentTimeMillis()
                val trackedPose = poseTracker.update(inferenceResult)
                val trackingMs = System.currentTimeMillis() - t1

                // 4. Motion Filtering (Jitter reduction)
                val t2 = System.currentTimeMillis()
                val filteredPose = motionFilter.filter(trackedPose)
                val filteringMs = System.currentTimeMillis() - t2

                // 5. Continuous Calibration Estimation
                val t3 = System.currentTimeMillis()
                val calibratedPose = calibrationEngine.process(filteredPose)
                val calibrationMs = System.currentTimeMillis() - t3

                // 6. Pose Quality & Stability Evaluation
                val t4 = System.currentTimeMillis()
                val evaluationResult = qualityEvaluator.evaluate(calibratedPose)
                val evaluationMs = System.currentTimeMillis() - t4

                // 7. Payload Mapping
                val t5 = System.currentTimeMillis()
                val poseFrameMap = PoseFrameMapper.mapToPoseFrameV1Map(
                    calibratedPose = calibratedPose,
                    evaluationResult = evaluationResult,
                    inferenceTimeMs = inferenceMs
                )
                val mappingMs = System.currentTimeMillis() - t5

                // Update diagnostic tracking metrics
                diagnosticTracker.recordInference(inferenceMs)
                diagnosticTracker.recordPoseProcessingStage(
                    trackingMs = trackingMs,
                    filteringMs = filteringMs,
                    calibrationMs = calibrationMs,
                    evaluationMs = evaluationMs,
                    mappingMs = mappingMs,
                    qualityScore = evaluationResult.qualityScore,
                    stabilityScore = evaluationResult.stabilityScore,
                    trackingState = trackedPose.trackingState.name,
                    posture = calibratedPose.calibrationData.posture,
                    poseLosses = poseTracker.totalPoseLosses.get(),
                    recoveries = poseTracker.totalRecoveries.get()
                )

                onFrameProcessedListener(poseFrameMap)
            } catch (e: Exception) {
                diagnosticTracker.recordFrameDropped()
            } finally {
                imageProxy.close()
                diagnosticTracker.queueDepth = 0
                isBusy.set(false)
            }
        }
    }

    fun shutdown() {
        executor.shutdownNow()
        poseTracker.reset()
        motionFilter.reset()
        calibrationEngine.reset()
    }
}
