package com.petalpath.cameraengine

import android.content.Context
import android.media.Image

interface IPoseEngineListener {
    fun onPoseResult(landmarks: List<Landmark3D>?, confidence: Float, inferenceTimeMs: Long)
    fun onError(errorMsg: String, throwable: Throwable?)
}

interface IPoseEngine {
    fun initialize(context: Context, listener: IPoseEngineListener): Boolean
    fun processFrame(mediaImage: Image, rotationDegrees: Int, timestampMs: Long)
    fun isInitialized(): Boolean
    fun dispose()
}
