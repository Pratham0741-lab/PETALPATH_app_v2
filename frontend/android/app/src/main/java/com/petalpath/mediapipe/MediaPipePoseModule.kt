package com.petalpath.mediapipe

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.mrousavy.camera.frameprocessors.FrameProcessorPluginRegistry

class MediaPipePoseModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "MediaPipePoseModule"
    }

    @ReactMethod
    fun initialize(options: ReadableMap, promise: Promise) {
        try {
            Log.d("MediaPipePoseModule", "MediaPipePoseModule.initialize called")
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("INIT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun dispose(promise: Promise) {
        try {
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DISPOSE_ERROR", e.message, e)
        }
    }
}
