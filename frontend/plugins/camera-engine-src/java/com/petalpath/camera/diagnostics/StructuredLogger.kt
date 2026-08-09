package com.petalpath.camera.diagnostics

import android.util.Log

object StructuredLogger {
    private const val TAG = "PetalPathCameraEngine"

    fun log(stage: String, durationMs: Long = 0L, status: String = "SUCCESS", details: String = "") {
        val threadName = Thread.currentThread().name
        val timestamp = System.currentTimeMillis()
        val formatted = "[$stage] [ts=$timestamp] [thread=$threadName] [duration=${durationMs}ms] [status=$status] $details".trim()
        Log.i(TAG, formatted)
    }

    fun warn(stage: String, status: String, details: String = "") {
        val threadName = Thread.currentThread().name
        val timestamp = System.currentTimeMillis()
        val formatted = "[$stage] [ts=$timestamp] [thread=$threadName] [status=$status] $details".trim()
        Log.w(TAG, formatted)
    }

    fun error(stage: String, status: String, details: String = "", throwable: Throwable? = null) {
        val threadName = Thread.currentThread().name
        val timestamp = System.currentTimeMillis()
        val formatted = "[$stage] [ts=$timestamp] [thread=$threadName] [status=$status] $details".trim()
        if (throwable != null) {
            Log.e(TAG, formatted, throwable)
        } else {
            Log.e(TAG, formatted)
        }
    }
}
