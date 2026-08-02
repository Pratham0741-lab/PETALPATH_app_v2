package com.petalpath.mediapipe

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.mrousavy.camera.frameprocessors.FrameProcessorPluginRegistry

class MediaPipePackage : ReactPackage {
    companion object {
        private var isRegistered = false

        init {
            registerPlugin()
        }

        @Synchronized
        fun registerPlugin() {
            if (isRegistered) return
            try {
                FrameProcessorPluginRegistry.addFrameProcessorPlugin("detectPose") { proxy, options ->
                    MediaPipePoseFrameProcessorPlugin(proxy, options)
                }
                isRegistered = true
                android.util.Log.d("MediaPipePackage", "Successfully registered FrameProcessorPlugin 'detectPose'")
            } catch (e: Throwable) {
                android.util.Log.w("MediaPipePackage", "FrameProcessorPlugin 'detectPose' registration skipped or already exists: ${e.message}")
            }
        }
    }

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(MediaPipePoseModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
