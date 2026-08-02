package com.petalpath.cameraengine

import kotlin.math.PI
import kotlin.math.abs

interface IMotionFilter {
    fun filter(landmarks: List<Landmark3D>): List<Landmark3D>
    fun reset()
}

/**
 * Exponential Moving Average Filter
 */
class EMAFilter(private val alpha: Float = 0.6f) : IMotionFilter {
    private var prevLandmarks: List<Landmark3D>? = null

    override fun filter(landmarks: List<Landmark3D>): List<Landmark3D> {
        val prev = prevLandmarks ?: run {
            prevLandmarks = landmarks
            return landmarks
        }

        if (prev.size != landmarks.size) {
            prevLandmarks = landmarks
            return landmarks
        }

        val filtered = landmarks.mapIndexed { idx, current ->
            val p = prev[idx]
            Landmark3D(
                x = p.x + alpha * (current.x - p.x),
                y = p.y + alpha * (current.y - p.y),
                z = p.z + alpha * (current.z - p.z),
                visibility = current.visibility
            )
        }

        prevLandmarks = filtered
        return filtered
    }

    override fun reset() {
        prevLandmarks = null
    }
}

/**
 * OneEuro Filter for low-latency adaptive jitter reduction
 */
class OneEuroFilter(
    private val minCutoff: Float = 1.0f,
    private val beta: Float = 0.007f,
    private val dCutoff: Float = 1.0f
) : IMotionFilter {

    private class SingleEuro(
        private val minCutoff: Float,
        private val beta: Float,
        private val dCutoff: Float
    ) {
        private var xPrev = 0f
        private var dxPrev = 0f
        private var tPrev = -1L

        private fun alpha(cutoff: Float, dt: Float): Float {
            val tau = 1.0f / (2.0f * PI.toFloat() * cutoff)
            return 1.0f / (1.0f + tau / dt)
        }

        fun filter(x: Float, timestamp: Long): Float {
            if (tPrev < 0) {
                tPrev = timestamp
                xPrev = x
                dxPrev = 0f
                return x
            }

            val dt = Math.max(1e-5f, (timestamp - tPrev) / 1000.0f)
            tPrev = timestamp

            val dx = (x - xPrev) / dt
            val edx = dxPrev + alpha(dCutoff, dt) * (dx - dxPrev)
            dxPrev = edx

            val cutoff = minCutoff + beta * abs(edx)
            val a = alpha(cutoff, dt)
            val xHat = xPrev + a * (x - xPrev)
            xPrev = xHat

            return xHat
        }

        fun reset() {
            tPrev = -1L
        }
    }

    private var filters: List<Triple<SingleEuro, SingleEuro, SingleEuro>>? = null

    override fun filter(landmarks: List<Landmark3D>): List<Landmark3D> {
        val now = System.currentTimeMillis()
        var currentFilters = filters

        if (currentFilters == null || currentFilters.size != landmarks.size) {
            currentFilters = landmarks.map {
                Triple(
                    SingleEuro(minCutoff, beta, dCutoff),
                    SingleEuro(minCutoff, beta, dCutoff),
                    SingleEuro(minCutoff, beta, dCutoff)
                )
            }
            filters = currentFilters
        }

        return landmarks.mapIndexed { idx, lm ->
            val (fx, fy, fz) = currentFilters[idx]
            Landmark3D(
                x = fx.filter(lm.x, now),
                y = fy.filter(lm.y, now),
                z = fz.filter(lm.z, now),
                visibility = lm.visibility
            )
        }
    }

    override fun reset() {
        filters?.forEach { (fx, fy, fz) ->
            fx.reset()
            fy.reset()
            fz.reset()
        }
        filters = null
    }
}

/**
 * Simple 1D Kalman Filter per coordinate
 */
class KalmanFilter(
    private val processNoise: Float = 1e-4f,
    private val measurementNoise: Float = 1e-2f
) : IMotionFilter {

    private class SingleKalman(private val q: Float, private val r: Float) {
        private var x = 0f
        private var p = 1f
        private var k = 0f
        private var initialized = false

        fun filter(measurement: Float): Float {
            if (!initialized) {
                x = measurement
                initialized = true
                return x
            }
            p += q
            k = p / (p + r)
            x += k * (measurement - x)
            p *= (1f - k)
            return x
        }

        fun reset() {
            initialized = false
            p = 1f
        }
    }

    private var kalmanNodes: List<Triple<SingleKalman, SingleKalman, SingleKalman>>? = null

    override fun filter(landmarks: List<Landmark3D>): List<Landmark3D> {
        var nodes = kalmanNodes
        if (nodes == null || nodes.size != landmarks.size) {
            nodes = landmarks.map {
                Triple(
                    SingleKalman(processNoise, measurementNoise),
                    SingleKalman(processNoise, measurementNoise),
                    SingleKalman(processNoise, measurementNoise)
                )
            }
            kalmanNodes = nodes
        }

        return landmarks.mapIndexed { idx, lm ->
            val (kx, ky, kz) = nodes[idx]
            Landmark3D(
                x = kx.filter(lm.x),
                y = ky.filter(lm.y),
                z = kz.filter(lm.z),
                visibility = lm.visibility
            )
        }
    }

    override fun reset() {
        kalmanNodes?.forEach { (kx, ky, kz) ->
            kx.reset()
            ky.reset()
            kz.reset()
        }
        kalmanNodes = null
    }
}
