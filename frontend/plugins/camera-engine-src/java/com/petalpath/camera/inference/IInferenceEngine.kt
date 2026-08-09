package com.petalpath.camera.inference

import android.content.Context
import com.petalpath.camera.model.ModelMetadata
import java.nio.ByteBuffer

interface IInferenceEngine {
    fun loadModel(context: Context): Boolean
    fun warmup(): Boolean
    fun processFrame(inputBuffer: ByteBuffer, timestamp: Long): InferenceResult?
    fun getMetadata(): ModelMetadata
    fun dispose()
}
