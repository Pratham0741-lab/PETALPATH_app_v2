package com.petalpath.camera.inference

import android.content.Context
import com.petalpath.camera.diagnostics.StructuredLogger
import com.petalpath.camera.model.ModelMetadata
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.gpu.CompatibilityList
import org.tensorflow.lite.gpu.GpuDelegate
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.channels.FileChannel

class MoveNetLightningEngine : IInferenceEngine {

    private var interpreter: Interpreter? = null
    private var gpuDelegate: GpuDelegate? = null
    private var isLoaded = false
    private var isWarmedUp = false
    private var delegateType = "CPU"

    // MoveNet Lightning expects 192x192 RGB input
    private val modelMetadata = ModelMetadata(
        modelName = "MoveNet Lightning",
        modelVersion = "3.0",
        inputResolutionWidth = 192,
        inputResolutionHeight = 192,
        keypointCount = 17,
        delegateType = "CPU"
    )

    // MoveNet output shape is [1, 1, 17, 3] -> 17 keypoints of [y, x, score]
    private val outputBuffer = Array(1) { Array(1) { Array(17) { FloatArray(3) } } }

    @Synchronized
    override fun loadModel(context: Context): Boolean {
        val startTime = System.currentTimeMillis()
        try {
            val fileDescriptor = context.assets.openFd("movenet_singlepose_lightning.tflite")
            val inputStream = FileInputStream(fileDescriptor.fileDescriptor)
            val fileChannel = inputStream.channel
            val startOffset = fileDescriptor.startOffset
            val declaredLength = fileDescriptor.declaredLength
            val modelBuffer = fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength)

            val options = Interpreter.Options()
            val compatList = CompatibilityList()

            if (compatList.isDelegateSupportedOnThisDevice) {
                gpuDelegate = GpuDelegate()
                options.addDelegate(gpuDelegate)
                delegateType = "GPU"
            } else {
                options.setNumThreads(4)
                delegateType = "CPU_MULTI_THREAD"
            }

            interpreter = Interpreter(modelBuffer, options)
            isLoaded = true
            val duration = System.currentTimeMillis() - startTime
            StructuredLogger.log("MoveNetLightningEngine", duration, "SUCCESS", "Loaded model using $delegateType delegate")
            return true
        } catch (e: Exception) {
            StructuredLogger.error("MoveNetLightningEngine", "MODEL_LOADING_FAILED", "Fallback to CPU", e)
            return tryCpuFallback(context, startTime)
        }
    }

    private fun tryCpuFallback(context: Context, startTime: Long): Boolean {
        return try {
            val fileDescriptor = context.assets.openFd("movenet_singlepose_lightning.tflite")
            val inputStream = FileInputStream(fileDescriptor.fileDescriptor)
            val fileChannel = inputStream.channel
            val modelBuffer = fileChannel.map(FileChannel.MapMode.READ_ONLY, fileDescriptor.startOffset, fileDescriptor.declaredLength)

            val options = Interpreter.Options().apply {
                setNumThreads(4)
            }
            interpreter = Interpreter(modelBuffer, options)
            delegateType = "CPU"
            isLoaded = true
            val duration = System.currentTimeMillis() - startTime
            StructuredLogger.log("MoveNetLightningEngine", duration, "SUCCESS", "Fallback CPU loading succeeded")
            true
        } catch (ex: Exception) {
            StructuredLogger.error("MoveNetLightningEngine", "CRITICAL_MODEL_FAILURE", "Failed to load model", ex)
            false
        }
    }

    @Synchronized
    override fun warmup(): Boolean {
        val interp = interpreter ?: return false
        if (!isLoaded) return false
        val startTime = System.currentTimeMillis()
        try {
            val numBytes = try { interp.getInputTensor(0).numBytes() } catch (e: Exception) { 192 * 192 * 3 * 4 }
            val dummyBuffer = ByteBuffer.allocateDirect(numBytes).apply {
                order(ByteOrder.nativeOrder())
            }
            interp.run(dummyBuffer, outputBuffer)
            isWarmedUp = true
            val duration = System.currentTimeMillis() - startTime
            StructuredLogger.log("MoveNetLightningEngine", duration, "WARMUP_COMPLETE", "Model warm-up dummy inference complete")
            return true
        } catch (e: Exception) {
            StructuredLogger.error("MoveNetLightningEngine", "WARMUP_FAILED", details = e.message ?: "", throwable = e)
            isWarmedUp = true
            return true
        }
    }

    @Synchronized
    override fun processFrame(inputBuffer: ByteBuffer, timestamp: Long): InferenceResult? {
        val interp = interpreter ?: return null
        if (!isLoaded) return null

        val startTime = System.currentTimeMillis()
        return try {
            interp.run(inputBuffer, outputBuffer)
            val duration = System.currentTimeMillis() - startTime

            val rawKeypoints = mutableListOf<RawMoveNetKeypoint>()

            for (i in 0 until 17) {
                val y = outputBuffer[0][0][i][0] // Normalized y coordinate [0, 1]
                val x = outputBuffer[0][0][i][1] // Normalized x coordinate [0, 1]
                val score = outputBuffer[0][0][i][2] // Confidence score [0, 1]

                rawKeypoints.add(RawMoveNetKeypoint(index = i, x = x, y = y, score = score))
            }

            // Calculate overall confidence from top 8 keypoints so off-screen feet don't penalize upper-body pose tracking
            val sortedScores = rawKeypoints.map { it.score }.sortedDescending()
            val top8Sum = sortedScores.take(8).sum()
            val overallConfidence = top8Sum / 8f

            InferenceResult(
                timestamp = timestamp,
                keypoints = rawKeypoints,
                inferenceTimeMs = duration,
                overallConfidence = overallConfidence
            )
        } catch (e: Exception) {
            StructuredLogger.error("MoveNetLightningEngine", "FRAME_PROCESSING_ERROR", details = e.message ?: "", throwable = e)
            null
        }
    }

    override fun getMetadata(): ModelMetadata {
        return modelMetadata.copy(delegateType = delegateType)
    }

    @Synchronized
    override fun dispose() {
        try {
            interpreter?.close()
            gpuDelegate?.close()
        } catch (e: Exception) {
            StructuredLogger.error("MoveNetLightningEngine", "DISPOSE_ERROR", details = e.message ?: "")
        } finally {
            interpreter = null
            gpuDelegate = null
            isLoaded = false
            isWarmedUp = false
        }
    }
}
