package com.petalpath.cameraengine

import android.content.Context
import android.os.SystemClock
import android.util.Log
import android.util.Size
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import java.util.concurrent.Executors

class CameraXManager(private val context: Context) : IPoseEngineListener {

    companion object {
        private const val TAG = "CameraXManager"
    }

    interface CameraEventListener {
        fun onPoseResultV1(result: PoseResultV1)
        fun onError(message: String)
    }

    private var cameraProvider: ProcessCameraProvider? = null
    private var isFrontLens = true
    private var listener: CameraEventListener? = null

    private var poseEngine: IPoseEngine = MediaPipePoseEngine()
    private var poseTracker = NativePoseTracker()
    private var motionFilter: IMotionFilter = EMAFilter(0.6f)
    private var calibrationEngine = NativeCalibrationEngine()

    private val cameraExecutor = Executors.newSingleThreadExecutor()

    private var cameraFPS = 0
    private var processingFPS = 0
    private var frameCount = 0
    private var lastFpsTimestamp = SystemClock.uptimeMillis()
    private var droppedFrames = 0
    val engineConfig = EngineConfig()

    // Stage Timings
    private var captureTimeMs: Long = 0
    private var mediaPipeTimeMs: Long = 0
    private var trackerTimeMs: Long = 0
    private var calibrationTimeMs: Long = 0
    private var filterTimeMs: Long = 0

    fun initializeEngine(listener: CameraEventListener): Boolean {
        this.listener = listener
        val success = poseEngine.initialize(context, this)
        Log.d(TAG, "CameraXManager initialized poseEngine success=$success")
        return success
    }

    fun startCamera(lifecycleOwner: LifecycleOwner, previewView: PreviewView) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            try {
                cameraProvider = cameraProviderFuture.get()
                bindCameraUseCases(lifecycleOwner, previewView)
            } catch (e: Throwable) {
                Log.e(TAG, "Failed to get CameraProvider: ${e.message}", e)
                listener?.onError("CameraProvider initialization failed: ${e.message}")
            }
        }, ContextCompat.getMainExecutor(context))
    }

    private fun bindCameraUseCases(lifecycleOwner: LifecycleOwner, previewView: PreviewView) {
        val provider = cameraProvider ?: return
        provider.unbindAll()

        val lensFacing = if (isFrontLens) CameraSelector.LENS_FACING_FRONT else CameraSelector.LENS_FACING_BACK
        val cameraSelector = CameraSelector.Builder().requireLensFacing(lensFacing).build()

        val preview = Preview.Builder().build().also {
            it.setSurfaceProvider(previewView.surfaceProvider)
        }

        val imageAnalysis = ImageAnalysis.Builder()
            .setTargetResolution(Size(1280, 720))
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
            .build()

        imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy: ImageProxy ->
            processImageProxy(imageProxy)
        }

        try {
            provider.bindToLifecycle(lifecycleOwner, cameraSelector, preview, imageAnalysis)
            Log.d(TAG, "CameraX bound successfully (LensFacing=$lensFacing)")
        } catch (e: Throwable) {
            Log.e(TAG, "CameraX binding failed: ${e.message}", e)
            listener?.onError("CameraX binding failed: ${e.message}")
        }
    }

    @androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
    private fun processImageProxy(imageProxy: ImageProxy) {
        val startCapture = SystemClock.uptimeMillis()
        val mediaImage = imageProxy.image
        if (mediaImage == null) {
            imageProxy.close()
            droppedFrames++
            return
        }

        frameCount++
        val now = SystemClock.uptimeMillis()
        if (now - lastFpsTimestamp >= 1000) {
            cameraFPS = frameCount
            processingFPS = frameCount
            frameCount = 0
            lastFpsTimestamp = now
        }

        val timestampMs = imageProxy.imageInfo.timestamp / 1_000_000
        val rotationDegrees = imageProxy.imageInfo.rotationDegrees

        captureTimeMs = SystemClock.uptimeMillis() - startCapture

        val startMP = SystemClock.uptimeMillis()
        poseEngine.processFrame(mediaImage, rotationDegrees, timestampMs)
        mediaPipeTimeMs = SystemClock.uptimeMillis() - startMP

        imageProxy.close()
    }

    override fun onPoseResult(landmarks: List<Landmark3D>?, confidence: Float, inferenceTimeMs: Long) {
        // Stage 1: Pose Tracker
        val startTracker = SystemClock.uptimeMillis()
        val trackingRes = if (engineConfig.trackingEnabled) {
            poseTracker.update(landmarks, confidence)
        } else {
            TrackingResult(TrackingState.TRACKING, landmarks, 1L, confidence, 80)
        }
        trackerTimeMs = SystemClock.uptimeMillis() - startTracker

        // Stage 2: Filter & Calibration
        val startFilter = SystemClock.uptimeMillis()
        val filteredLandmarks: List<Landmark3D>?
        val calData: CalibrationData

        if (trackingRes.state == TrackingState.TRACKING && trackingRes.landmarks != null) {
            filteredLandmarks = motionFilter.filter(trackingRes.landmarks)
            filterTimeMs = SystemClock.uptimeMillis() - startFilter

            val startCal = SystemClock.uptimeMillis()
            calData = if (engineConfig.calibrationEnabled) {
                calibrationEngine.calibrate(filteredLandmarks)
            } else {
                CalibrationData(scaleFactor = 1.0f, isCalibrated = true)
            }
            calibrationTimeMs = SystemClock.uptimeMillis() - startCal
        } else {
            filteredLandmarks = null
            motionFilter.reset()
            calData = CalibrationData()
            filterTimeMs = 0
            calibrationTimeMs = 0
        }

        val stageTimings = PipelineStageTimings(
            captureTimeMs = captureTimeMs,
            mediaPipeTimeMs = mediaPipeTimeMs,
            trackerTimeMs = trackerTimeMs,
            calibrationTimeMs = calibrationTimeMs,
            filterTimeMs = filterTimeMs,
            bridgeEmitTimeMs = 1
        )

        val metrics = PoseMetrics(
            cameraFPS = cameraFPS,
            processingFPS = processingFPS,
            inferenceTimeMs = inferenceTimeMs,
            droppedFrames = droppedFrames,
            queueDepth = 0,
            cpuUsage = 15.0f,
            gpuUsage = 20.0f,
            trackingConfidence = trackingRes.trackingConfidence,
            stageTimings = stageTimings
        )

        val poseResult = PoseResultV1(
            version = "v1",
            timestamp = System.currentTimeMillis(),
            trackingState = trackingRes.state.name.lowercase(),
            confidence = trackingRes.trackingConfidence,
            qualityScore = trackingRes.qualityScore,
            trackingId = trackingRes.trackingId,
            metrics = metrics,
            calibration = calData,
            landmarks = filteredLandmarks
        )

        listener?.onPoseResultV1(poseResult)
    }

    override fun onError(errorMsg: String, throwable: Throwable?) {
        listener?.onError(errorMsg)
    }

    fun switchCamera(lifecycleOwner: LifecycleOwner, previewView: PreviewView) {
        isFrontLens = !isFrontLens
        bindCameraUseCases(lifecycleOwner, previewView)
    }

    fun setDebugLevel(levelStr: String) {
        engineConfig.debugLevel = try {
            DebugLevel.valueOf(levelStr.uppercase())
        } catch (e: Throwable) {
            DebugLevel.BASIC
        }
    }

    fun setFilterType(typeStr: String) {
        engineConfig.filterType = typeStr.lowercase()
        motionFilter = when (engineConfig.filterType) {
            "one_euro" -> OneEuroFilter()
            "kalman" -> KalmanFilter()
            else -> EMAFilter()
        }
    }

    fun updateConfig(configMap: Map<String, Any?>) {
        if (configMap.containsKey("trackingEnabled")) {
            engineConfig.trackingEnabled = configMap["trackingEnabled"] as? Boolean ?: true
        }
        if (configMap.containsKey("calibrationEnabled")) {
            engineConfig.calibrationEnabled = configMap["calibrationEnabled"] as? Boolean ?: true
        }
        if (configMap.containsKey("filterType")) {
            setFilterType(configMap["filterType"] as? String ?: "ema")
        }
        if (configMap.containsKey("debugLevel")) {
            setDebugLevel(configMap["debugLevel"] as? String ?: "BASIC")
        }
    }

    fun stop() {
        try {
            cameraProvider?.unbindAll()
            poseEngine.dispose()
            poseTracker.reset()
            motionFilter.reset()
            calibrationEngine.reset()
        } catch (e: Throwable) {
            Log.w(TAG, "Error stopping CameraXManager: ${e.message}")
        }
    }
}
