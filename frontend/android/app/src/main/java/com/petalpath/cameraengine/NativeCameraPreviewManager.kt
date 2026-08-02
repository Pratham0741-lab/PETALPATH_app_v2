package com.petalpath.cameraengine

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext

class NativeCameraPreviewManager : SimpleViewManager<NativeCameraPreviewView>() {

    companion object {
        const val REACT_CLASS = "NativeCameraPreview"
    }

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): NativeCameraPreviewView {
        val view = NativeCameraPreviewView(reactContext)
        val currentActivity = reactContext.currentActivity
        if (currentActivity is androidx.lifecycle.LifecycleOwner) {
            CameraEngineModule.sharedCameraXManager?.let { manager ->
                view.attachToCamera(manager, currentActivity)
            }
        }
        return view
    }
}
