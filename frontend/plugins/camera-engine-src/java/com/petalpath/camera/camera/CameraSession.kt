package com.petalpath.camera.camera

import android.content.Context
import android.view.View
import android.view.ViewTreeObserver
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.petalpath.camera.diagnostics.DiagnosticTracker
import com.petalpath.camera.diagnostics.StructuredLogger
import com.petalpath.camera.state.CameraState
import java.util.concurrent.Executors

class CameraSession(
    private val context: Context,
    private val frameDispatcher: FrameDispatcher,
    private val diagnosticTracker: DiagnosticTracker
) {

    private var cameraProvider: ProcessCameraProvider? = null
    private var isFrontCamera = true
    private var previewView: PreviewView? = null
    private var lifecycleOwner: LifecycleOwner? = null
    private var isStopped = false

    private val cameraExecutor = Executors.newSingleThreadExecutor()

    fun bindPreviewView(view: PreviewView, owner: LifecycleOwner) {
        this.previewView = view
        this.lifecycleOwner = owner

        val startWhenReady = Runnable {
            if (!isStopped && view.isAttachedToWindow) {
                StructuredLogger.log("CameraSession", 0, "BIND_PREVIEW", "View attached to window (${view.width}x${view.height}), starting session")
                startSession()
            }
        }

        if (view.isAttachedToWindow && view.width > 0 && view.height > 0) {
            view.post(startWhenReady)
        } else {
            StructuredLogger.log("CameraSession", 0, "BIND_PREVIEW", "View not yet attached, adding OnAttachStateChangeListener")
            view.addOnAttachStateChangeListener(object : View.OnAttachStateChangeListener {
                override fun onViewAttachedToWindow(v: View) {
                    v.removeOnAttachStateChangeListener(this)
                    v.post(startWhenReady)
                }
                override fun onViewDetachedFromWindow(v: View) {}
            })

            view.viewTreeObserver.addOnGlobalLayoutListener(object : ViewTreeObserver.OnGlobalLayoutListener {
                override fun onGlobalLayout() {
                    if (view.isAttachedToWindow && view.width > 0 && view.height > 0) {
                        view.viewTreeObserver.removeOnGlobalLayoutListener(this)
                        view.post(startWhenReady)
                    }
                }
            })
        }
    }

    fun startSession() {
        if (isStopped) {
            StructuredLogger.warn("CameraSession", "START_SKIPPED", "Session already stopped")
            return
        }
        diagnosticTracker.cameraState = CameraState.INITIALIZING.name
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)

        cameraProviderFuture.addListener({
            try {
                cameraProvider = cameraProviderFuture.get()
                val view = previewView
                if (view != null) {
                    view.post {
                        bindCameraUseCases()
                    }
                } else {
                    bindCameraUseCases()
                }
            } catch (e: Exception) {
                diagnosticTracker.cameraState = CameraState.ERROR.name
                StructuredLogger.error("CameraSession", "CAMERA_INIT_FAILED", details = e.message ?: "", throwable = e)
            }
        }, ContextCompat.getMainExecutor(context))
    }

    private fun bindCameraUseCases() {
        val provider = cameraProvider ?: run {
            StructuredLogger.warn("CameraSession", "BIND_SKIPPED", "cameraProvider is null")
            return
        }
        val owner = lifecycleOwner ?: run {
            StructuredLogger.warn("CameraSession", "BIND_SKIPPED", "lifecycleOwner is null")
            return
        }
        val view = previewView ?: run {
            StructuredLogger.warn("CameraSession", "BIND_SKIPPED", "previewView is null")
            return
        }

        if (isStopped) {
            StructuredLogger.warn("CameraSession", "BIND_SKIPPED", "Session already stopped")
            return
        }

        if (!view.isAttachedToWindow) {
            StructuredLogger.warn("CameraSession", "BIND_DEFERRED", "previewView not attached to window yet, deferring")
            return
        }

        val cameraSelector = if (isFrontCamera) CameraSelector.DEFAULT_FRONT_CAMERA else CameraSelector.DEFAULT_BACK_CAMERA

        val preview = Preview.Builder()
            .build()
            .also {
                it.setSurfaceProvider(view.surfaceProvider)
            }

        val imageAnalysis = ImageAnalysis.Builder()
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
            .build()

        imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy ->
            val rotationDegrees = imageProxy.imageInfo.rotationDegrees
            frameDispatcher.dispatchFrame(imageProxy, rotationDegrees, isFrontCamera)
        }

        try {
            provider.unbindAll()
            provider.bindToLifecycle(owner, cameraSelector, preview, imageAnalysis)
            diagnosticTracker.cameraState = CameraState.RUNNING.name
            StructuredLogger.log("CameraSession", 0, "BOUND", "CameraX use cases bound successfully (front=$isFrontCamera, viewSize=${view.width}x${view.height})")
        } catch (e: Exception) {
            diagnosticTracker.cameraState = CameraState.ERROR.name
            StructuredLogger.error("CameraSession", "CAMERA_BIND_FAILED", details = e.message ?: "", throwable = e)
        }
    }

    fun switchCamera() {
        isFrontCamera = !isFrontCamera
        StructuredLogger.log("CameraSession", 0, "SWITCH_CAMERA", "Switching camera (now front=$isFrontCamera)")
        val view = previewView
        if (view != null) {
            view.post {
                bindCameraUseCases()
            }
        } else {
            bindCameraUseCases()
        }
    }

    fun pause() {
        diagnosticTracker.cameraState = CameraState.PAUSED.name
        val view = previewView
        if (view != null) {
            view.post {
                cameraProvider?.unbindAll()
            }
        } else {
            cameraProvider?.unbindAll()
        }
    }

    fun resume() {
        if (diagnosticTracker.cameraState == CameraState.PAUSED.name) {
            val view = previewView
            if (view != null) {
                view.post {
                    bindCameraUseCases()
                }
            } else {
                bindCameraUseCases()
            }
        }
    }

    fun stop() {
        isStopped = true
        diagnosticTracker.cameraState = CameraState.STOPPED.name
        val view = previewView
        if (view != null) {
            view.post {
                cameraProvider?.unbindAll()
            }
        } else {
            cameraProvider?.unbindAll()
        }
        cameraExecutor.shutdown()
    }
}
