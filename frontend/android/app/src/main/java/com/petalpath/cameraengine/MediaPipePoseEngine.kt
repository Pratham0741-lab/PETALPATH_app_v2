package com.petalpath.cameraengine

import android.content.Context
import android.media.Image
import android.os.SystemClock
import android.util.Log
import com.google.mediapipe.framework.image.MediaImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.ImageProcessingOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult

class MediaPipePoseEngine : IPoseEngine {

    companion object {
        private const val TAG = "MediaPipePoseEngine"
        private const val MODEL_NAME = "pose_landmarker_lite.task"
    }

    private var poseLandmarker: PoseLandmarker? = null
    private var listener: IPoseEngineListener? = null
    private var isInit = false
    private var frameStartTimeMs: Long = 0

    override fun initialize(context: Context, listener: IPoseEngineListener): Boolean {
        this.listener = listener
        try {
            // Try GPU delegate first, fallback to CPU if GPU initialization fails
            var success = initLandmarker(context, Delegate.GPU)
            if (!success) {
                Log.w(TAG, "GPU delegate initialization failed, falling back to CPU delegate")
                success = initLandmarker(context, Delegate.CPU)
            }
            isInit = success
            if (isInit) {
                Log.d(TAG, "MediaPipePoseEngine initialized successfully with model: $MODEL_NAME")
            }
            return isInit
        } catch (e: Throwable) {
            Log.e(TAG, "Failed to initialize MediaPipePoseEngine: ${e.message}", e)
            this.listener?.onError("Failed to load MediaPipe model: ${e.message}", e)
            return false
        }
    }

    private fun initLandmarker(context: Context, delegate: Delegate): Boolean {
        return try {
            val baseOptions = BaseOptions.builder()
                .setModelAssetPath(MODEL_NAME)
                .setDelegate(delegate)
                .build()

            val options = PoseLandmarker.PoseLandmarkerOptions.builder()
                .setBaseOptions(baseOptions)
                .setRunningMode(RunningMode.LIVE_STREAM)
                .setNumPoses(1)
                .setMinPoseDetectionConfidence(0.5f)
                .setMinTrackingConfidence(0.5f)
                .setMinPosePresenceConfidence(0.5f)
                .setResultListener { result: PoseLandmarkerResult, _ ->
                    handleResult(result)
                }
                .setErrorListener { error: RuntimeException ->
                    Log.e(TAG, "MediaPipe error: ${error.message}", error)
                    this.listener?.onError(error.message ?: "MediaPipe Error", error)
                }
                .build()

            poseLandmarker = PoseLandmarker.createFromOptions(context, options)
            true
        } catch (e: Throwable) {
            Log.w(TAG, "initLandmarker failed with delegate $delegate: ${e.message}")
            false
        }
    }

    override fun processFrame(mediaImage: Image, rotationDegrees: Int, timestampMs: Long) {
        if (!isInit || poseLandmarker == null) return
        try {
            frameStartTimeMs = SystemClock.uptimeMillis()
            val mpImage = MediaImageBuilder(mediaImage).build()
            val imageProcessingOptions = ImageProcessingOptions.builder()
                .setRotationDegrees(rotationDegrees)
                .build()

            poseLandmarker?.detectAsync(mpImage, imageProcessingOptions, timestampMs)
        } catch (e: Throwable) {
            Log.e(TAG, "Error processing frame in MediaPipe: ${e.message}", e)
        }
    }

    private fun handleResult(result: PoseLandmarkerResult) {
        val inferenceTimeMs = Math.max(1L, SystemClock.uptimeMillis() - frameStartTimeMs)
        val landmarksList = result.landmarks()

        Log.d(
            TAG,
            "MediaPipe callback entered | poseCount=${landmarksList?.size ?: 0} | processingTimeMs=$inferenceTimeMs"
        )

        if (landmarksList.isNullOrEmpty()) {
            listener?.onPoseResult(null, 0.0f, inferenceTimeMs)
            return
        }

        val firstPose = landmarksList[0]
        if (firstPose.isEmpty()) {
            listener?.onPoseResult(null, 0.0f, inferenceTimeMs)
            return
        }

        Log.d(
            TAG,
            "MediaPipe pose detected | landmarkCount=${firstPose.size} | firstLandmark=(${firstPose[0].x()}, ${firstPose[0].y()}, ${firstPose[0].z()})"
        )

        val mappedLandmarks = firstPose.map { lm ->
            Landmark3D(
                x = lm.x(),
                y = lm.y(),
                z = lm.z(),
                visibility = lm.presence().orElse(0.9f)
            )
        }

        listener?.onPoseResult(mappedLandmarks, 0.95f, inferenceTimeMs)
    }

    override fun isInitialized(): Boolean = isInit

    override fun dispose() {
        try {
            poseLandmarker?.close()
        } catch (e: Throwable) {
            Log.w(TAG, "Error closing poseLandmarker: ${e.message}")
        }
        poseLandmarker = null
        isInit = false
    }
}
