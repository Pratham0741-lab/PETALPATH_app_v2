package com.petalpath.cameraengine

import android.content.Context
import android.widget.FrameLayout
import androidx.camera.view.PreviewView
import androidx.lifecycle.LifecycleOwner

class NativeCameraPreviewView(context: Context) : FrameLayout(context) {

    val previewView: PreviewView = PreviewView(context).apply {
        scaleType = PreviewView.ScaleType.FILL_CENTER
    }

    init {
        addView(
            previewView,
            LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        )
    }

    fun attachToCamera(cameraXManager: CameraXManager, lifecycleOwner: LifecycleOwner) {
        cameraXManager.startCamera(lifecycleOwner, previewView)
    }
}
