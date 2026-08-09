package com.petalpath.camera.bridge

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.petalpath.camera.camera.CameraSession
import com.petalpath.camera.camera.FrameDispatcher
import com.petalpath.camera.diagnostics.DiagnosticTracker
import com.petalpath.camera.diagnostics.StructuredLogger
import com.petalpath.camera.inference.MoveNetLightningEngine

class CameraEngineTurboModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val MODULE_NAME = "PetalPathCameraEngine"
        private var instance: CameraEngineTurboModule? = null

        fun getInstance(): CameraEngineTurboModule? = instance
    }

    val diagnosticTracker = DiagnosticTracker()
    val inferenceEngine = MoveNetLightningEngine()
    private var frameDispatcher: FrameDispatcher? = null
    var cameraSession: CameraSession? = null
    private var pendingPreviewView: androidx.camera.view.PreviewView? = null
    private var pendingLifecycleOwner: androidx.lifecycle.LifecycleOwner? = null
    @Volatile private var isStarted = false

    init {
        instance = this
    }

    fun attachPreviewView(view: androidx.camera.view.PreviewView, owner: androidx.lifecycle.LifecycleOwner) {
        StructuredLogger.log("CameraEngineTurboModule", 0, "ATTACH_PREVIEW", "View attached, isStarted=$isStarted, cameraSession=${cameraSession != null}")
        pendingPreviewView = view
        pendingLifecycleOwner = owner
        // If the engine is already started and a session exists, bind immediately
        cameraSession?.bindPreviewView(view, owner)
    }

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun start(promise: Promise) {
        try {
            StructuredLogger.log("CameraEngineTurboModule", 0, "START_INITIATED", "Initializing MoveNet engine and camera session")

            // Stop any existing session first to ensure clean state
            if (isStarted) {
                StructuredLogger.log("CameraEngineTurboModule", 0, "RESTART", "Stopping existing session before restart")
                cameraSession?.stop()
                frameDispatcher?.shutdown()
                inferenceEngine.dispose()
            }

            val loaded = inferenceEngine.loadModel(reactContext)
            if (!loaded) {
                promise.reject("MODEL_LOADING_FAILED", "Failed to load MoveNet model")
                return
            }

            val warmedUp = inferenceEngine.warmup()
            if (!warmedUp) {
                promise.reject("MODEL_WARMUP_FAILED", "Failed model warm-up execution")
                return
            }

            frameDispatcher = FrameDispatcher(inferenceEngine, diagnosticTracker) { poseFrameMap ->
                emitPoseFrameEvent(poseFrameMap)
            }

            val session = CameraSession(reactContext, frameDispatcher!!, diagnosticTracker)
            cameraSession = session
            isStarted = true

            // If the native view was already rendered, bind it now
            val pv = pendingPreviewView
            val lo = pendingLifecycleOwner
            if (pv != null && lo != null) {
                StructuredLogger.log("CameraEngineTurboModule", 0, "DEFERRED_BIND", "Binding pending preview view to new session")
                session.bindPreviewView(pv, lo)
            } else {
                StructuredLogger.warn("CameraEngineTurboModule", "NO_PREVIEW_VIEW", "No pending preview view at start time, will bind when view attaches")
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CAMERA_START_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        try {
            isStarted = false
            cameraSession?.stop()
            cameraSession = null
            frameDispatcher?.shutdown()
            frameDispatcher = null
            inferenceEngine.dispose()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CAMERA_STOP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun pause(promise: Promise) {
        try {
            cameraSession?.pause()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CAMERA_PAUSE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun resume(promise: Promise) {
        try {
            cameraSession?.resume()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CAMERA_RESUME_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun switchCamera(promise: Promise) {
        try {
            cameraSession?.switchCamera()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CAMERA_SWITCH_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getMetrics(promise: Promise) {
        try {
            val metricsMap = diagnosticTracker.getMetricsMap()
            val writableMap = Arguments.createMap()
            metricsMap.forEach { (key, value) ->
                when (value) {
                    is Number -> writableMap.putDouble(key, value.toDouble())
                    is String -> writableMap.putString(key, value)
                    is Boolean -> writableMap.putBoolean(key, value)
                }
            }

            val metadata = inferenceEngine.getMetadata()
            val metaMap = Arguments.createMap().apply {
                putString("modelName", metadata.modelName)
                putString("modelVersion", metadata.modelVersion)
                putInt("inputResolutionWidth", metadata.inputResolutionWidth)
                putInt("inputResolutionHeight", metadata.inputResolutionHeight)
                putInt("keypointCount", metadata.keypointCount)
                putString("delegateType", metadata.delegateType)
            }
            writableMap.putMap("modelMetadata", metaMap)

            promise.resolve(writableMap)
        } catch (e: Exception) {
            promise.reject("GET_METRICS_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN NativeEventEmitter support
    }

    @ReactMethod
    fun removeListeners(count: Double) {
        // Required for RN NativeEventEmitter support
    }

    private fun emitPoseFrameEvent(poseFrameMap: WritableMap) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onPoseFrame", poseFrameMap)
        }
    }
}
