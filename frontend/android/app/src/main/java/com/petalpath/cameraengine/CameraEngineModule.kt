package com.petalpath.cameraengine

import android.util.Log
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class CameraEngineModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), CameraXManager.CameraEventListener {

    companion object {
        const val MODULE_NAME = "CameraEngineModule"
        const val EVENT_NAME = "onPoseResult"
        private const val TAG = "CameraEngineModule"

        @JvmStatic
        var sharedCameraXManager: CameraXManager? = null
            private set
    }

    private var cameraXManager: CameraXManager? = null

    init {
        val manager = CameraXManager(reactContext)
        sharedCameraXManager = manager
        cameraXManager = manager
        manager.initializeEngine(this)
    }

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun start(activityId: String, promise: Promise) {
        try {
            Log.d(TAG, "CameraEngineModule.start called for activity: $activityId")
            promise.resolve(true)
        } catch (e: Throwable) {
            promise.reject("START_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        try {
            cameraXManager?.stop()
            promise.resolve(true)
        } catch (e: Throwable) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun pause(promise: Promise) {
        promise.resolve(true)
    }

    @ReactMethod
    fun resume(promise: Promise) {
        promise.resolve(true)
    }

    @ReactMethod
    fun switchCamera(promise: Promise) {
        try {
            promise.resolve(true)
        } catch (e: Throwable) {
            promise.reject("SWITCH_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setDebugLevel(levelStr: String, promise: Promise) {
        try {
            cameraXManager?.setDebugLevel(levelStr)
            promise.resolve(true)
        } catch (e: Throwable) {
            promise.reject("DEBUG_LEVEL_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setFilterType(typeStr: String, promise: Promise) {
        try {
            cameraXManager?.setFilterType(typeStr)
            promise.resolve(true)
        } catch (e: Throwable) {
            promise.reject("FILTER_TYPE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun updateConfig(configMap: ReadableMap, promise: Promise) {
        try {
            cameraXManager?.updateConfig(configMap.toHashMap())
            promise.resolve(true)
        } catch (e: Throwable) {
            promise.reject("CONFIG_UPDATE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    override fun onPoseResultV1(result: PoseResultV1) {
        try {
            val reactCtx = reactApplicationContext
            if (reactCtx.hasActiveReactInstance()) {
                val currentDebugLevel = cameraXManager?.engineConfig?.debugLevel ?: DebugLevel.BASIC
                val poseMap = result.toWritableMap(debugLevel = currentDebugLevel)
                reactCtx
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(EVENT_NAME, poseMap)
            }
        } catch (e: Throwable) {
            Log.e(TAG, "Error emitting onPoseResult event: ${e.message}", e)
        }
    }

    override fun onError(message: String) {
        Log.e(TAG, "CameraEngine error: $message")
    }
}
