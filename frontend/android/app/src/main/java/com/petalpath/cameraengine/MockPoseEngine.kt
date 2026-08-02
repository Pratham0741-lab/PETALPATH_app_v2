package com.petalpath.cameraengine

import android.content.Context
import android.media.Image
import android.os.SystemClock

class MockPoseEngine : IPoseEngine {
    private var listener: IPoseEngineListener? = null
    private var isInit = false

    override fun initialize(context: Context, listener: IPoseEngineListener): Boolean {
        this.listener = listener
        this.isInit = true
        return true
    }

    override fun processFrame(mediaImage: Image, rotationDegrees: Int, timestampMs: Long) {
        if (!isInit) return
        val dummyLandmarks = List(33) { Landmark3D(0.5f, 0.5f, 0.0f, 0.9f) }
        listener?.onPoseResult(dummyLandmarks, 0.99f, 5)
    }

    override fun isInitialized(): Boolean = isInit

    override fun dispose() {
        isInit = false
        listener = null
    }
}
