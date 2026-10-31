package com.petalpath.camera.preprocessing

import androidx.camera.core.ImageProxy
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Direct YUV_420_888 ImageProxy to pre-allocated RGB ByteBuffer converter.
 * Zero Bitmap allocation during processing for optimal memory and CPU performance.
 *
 * What the model sees: the camera frame turned upright, mirrored if it is the
 * front camera, and fitted into the square model input without stretching.
 *
 *  - Upright. CameraX delivers frames in the sensor's orientation (landscape on
 *    a phone) with `rotationDegrees` saying how far to turn them clockwise. That
 *    value used to be ignored, so a child standing in front of an upright phone
 *    reached MoveNet lying on their side: raised arms looked horizontal and no
 *    "hands up" pose could ever pass.
 *  - Mirrored on the upright image (left-right), matching the selfie preview.
 *    It used to flip the raw sensor x axis, which on a rotated frame is the
 *    child's head-to-feet axis.
 *  - Letterboxed. The upright frame is scaled uniformly to fit the square and
 *    centred, with black borders, instead of being stretched to 192x192, so the
 *    angles and distances the pose checks measure are not distorted, and hands
 *    raised to the top of the frame are not cropped off.
 *
 * Keypoints come back normalised to this square; the app's pose checks work
 * on relative geometry, so the borders do not affect them.
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

        val mapper = UprightMapper(srcWidth, srcHeight, rotationDegrees, isFrontCamera, targetWidth, targetHeight)

        for (targetY in 0 until targetHeight) {
            for (targetX in 0 until targetWidth) {
                val src = mapper.toSource(targetX, targetY)

                var r = 0
                var g = 0
                var b = 0
                if (src >= 0) {
                    val sampleX = src % srcWidth
                    val sampleY = src / srcWidth

                    // YUV coordinate mapping
                    val yIndex = sampleY * yRowStride + sampleX
                    val uvIndex = (sampleY / 2) * uvRowStride + (sampleX / 2) * uvPixelStride

                    val yVal = if (yIndex < yBuffer.capacity()) (yBuffer.get(yIndex).toInt() and 0xFF) else 0
                    val uVal = if (uvIndex < uBuffer.capacity()) (uBuffer.get(uvIndex).toInt() and 0xFF) - 128 else 0
                    val vVal = if (uvIndex < vBuffer.capacity()) (vBuffer.get(uvIndex).toInt() and 0xFF) - 128 else 0

                    // Standard YUV -> RGB matrix conversion
                    r = Math.max(0, Math.min(255, (yVal + 1.370705f * vVal).toInt()))
                    g = Math.max(0, Math.min(255, (yVal - 0.337633f * uVal - 0.698001f * vVal).toInt()))
                    b = Math.max(0, Math.min(255, (yVal + 1.732446f * uVal).toInt()))
                }

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

/**
 * Maps a pixel of the square model input back to the camera frame: undo the
 * letterbox, undo the mirror, undo the rotation. Pure arithmetic, no Android
 * types, so it can be checked on its own.
 */
class UprightMapper(
    private val srcWidth: Int,
    private val srcHeight: Int,
    rotationDegrees: Int,
    private val mirror: Boolean,
    private val targetWidth: Int,
    private val targetHeight: Int
) {
    private val rotation = ((rotationDegrees % 360) + 360) % 360

    /** Size of the frame once turned upright. */
    val uprightWidth = if (rotation == 90 || rotation == 270) srcHeight else srcWidth
    val uprightHeight = if (rotation == 90 || rotation == 270) srcWidth else srcHeight

    // Uniform scale that fits the upright frame inside the target, centred.
    private val scale = Math.max(
        uprightWidth.toFloat() / targetWidth.toFloat(),
        uprightHeight.toFloat() / targetHeight.toFloat()
    )
    private val offsetX = (targetWidth * scale - uprightWidth) / 2f
    private val offsetY = (targetHeight * scale - uprightHeight) / 2f

    /** Source pixel index (y * srcWidth + x) for a target pixel, or -1 for the border. */
    fun toSource(targetX: Int, targetY: Int): Int {
        var ux = ((targetX + 0.5f) * scale - offsetX).toInt()
        val uy = ((targetY + 0.5f) * scale - offsetY).toInt()
        if (ux < 0 || uy < 0 || ux >= uprightWidth || uy >= uprightHeight) return -1

        // Front camera: mirror left-right on the upright image, like the preview.
        if (mirror) ux = uprightWidth - 1 - ux

        // Inverse of turning the source clockwise by `rotation` degrees.
        val sx: Int
        val sy: Int
        when (rotation) {
            90 -> { sx = uy; sy = srcHeight - 1 - ux }
            180 -> { sx = srcWidth - 1 - ux; sy = srcHeight - 1 - uy }
            270 -> { sx = srcWidth - 1 - uy; sy = ux }
            else -> { sx = ux; sy = uy }
        }
        if (sx < 0 || sy < 0 || sx >= srcWidth || sy >= srcHeight) return -1
        return sy * srcWidth + sx
    }
}
