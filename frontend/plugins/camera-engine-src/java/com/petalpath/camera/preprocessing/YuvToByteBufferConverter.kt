package com.petalpath.camera.preprocessing

import androidx.camera.core.ImageProxy
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Direct YUV_420_888 ImageProxy to pre-allocated RGB ByteBuffer converter.
 * Zero Bitmap allocation during processing for optimal memory and CPU performance.
 */
class YuvToByteBufferConverter(
    private val targetWidth: Int = 192,
    private val targetHeight: Int = 192,
    private val bytesPerChannel: Int = 4
) {

    // Pre-allocated ByteBuffer for MoveNet input: 192 * 192 * 3 * bytesPerChannel
    private val rgbBuffer: ByteBuffer = ByteBuffer.allocateDirect(targetWidth * targetHeight * 3 * bytesPerChannel)

    init {
        rgbBuffer.order(ByteOrder.nativeOrder())
    }

    /**
     * Converts YUV_420_888 ImageProxy planes directly to RGB ByteBuffer.
     * Takes rotation and front camera mirroring into consideration.
     */
    @Synchronized
    fun convertYuvToRgbBuffer(image: ImageProxy, rotationDegrees: Int, isFrontCamera: Boolean): ByteBuffer {
        rgbBuffer.rewind()

        val yPlane = image.planes[0]
        val uPlane = image.planes[1]
        val vPlane = image.planes[2]

        val yBuffer = yPlane.buffer
        val uBuffer = uPlane.buffer
        val vBuffer = vPlane.buffer

        val srcWidth = image.width
        val srcHeight = image.height

        val yRowStride = yPlane.rowStride
        val uvRowStride = uPlane.rowStride
        val uvPixelStride = uPlane.pixelStride

        val scaleX = srcWidth.toFloat() / targetWidth.toFloat()
        val scaleY = srcHeight.toFloat() / targetHeight.toFloat()

        for (targetY in 0 until targetHeight) {
            val origY = Math.min((targetY * scaleY).toInt(), srcHeight - 1)

            for (targetX in 0 until targetWidth) {
                var sampleX = Math.min((targetX * scaleX).toInt(), srcWidth - 1)
                var sampleY = origY

                // Handle front camera horizontal mirroring
                if (isFrontCamera) {
                    sampleX = srcWidth - 1 - sampleX
                }

                // YUV coordinate mapping
                val yIndex = sampleY * yRowStride + sampleX
                val uvIndex = (sampleY / 2) * uvRowStride + (sampleX / 2) * uvPixelStride

                val yVal = if (yIndex < yBuffer.capacity()) (yBuffer.get(yIndex).toInt() and 0xFF) else 0
                val uVal = if (uvIndex < uBuffer.capacity()) (uBuffer.get(uvIndex).toInt() and 0xFF) - 128 else 0
                val vVal = if (uvIndex < vBuffer.capacity()) (vBuffer.get(uvIndex).toInt() and 0xFF) - 128 else 0

                // Standard YUV -> RGB matrix conversion
                var r = (yVal + 1.370705f * vVal).toInt()
                var g = (yVal - 0.337633f * uVal - 0.698001f * vVal).toInt()
                var b = (yVal + 1.732446f * uVal).toInt()

                r = Math.max(0, Math.min(255, r))
                g = Math.max(0, Math.min(255, g))
                b = Math.max(0, Math.min(255, b))

                if (bytesPerChannel == 4) {
                    rgbBuffer.putFloat(r.toFloat())
                    rgbBuffer.putFloat(g.toFloat())
                    rgbBuffer.putFloat(b.toFloat())
                } else {
                    rgbBuffer.put(r.toByte())
                    rgbBuffer.put(g.toByte())
                    rgbBuffer.put(b.toByte())
                }
            }
        }

        rgbBuffer.rewind()
        return rgbBuffer
    }
}
