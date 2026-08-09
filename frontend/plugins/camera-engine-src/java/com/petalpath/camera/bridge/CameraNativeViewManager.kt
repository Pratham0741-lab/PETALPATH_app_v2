package com.petalpath.camera.bridge

import android.widget.FrameLayout
import androidx.camera.view.PreviewView
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.petalpath.camera.diagnostics.StructuredLogger

class CameraNativeViewManager : SimpleViewManager<FrameLayout>() {

    companion object {
        const val REACT_CLASS = "PetalPathNativeCameraView"
    }

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(context: ThemedReactContext): FrameLayout {
        val container = object : FrameLayout(context) {
            private val measureAndLayout = Runnable {
                measure(
                    MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                    MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
                )
                layout(left, top, right, bottom)
            }

            override fun requestLayout() {
                super.requestLayout()
                post(measureAndLayout)
            }
        }

        val previewView = PreviewView(context).apply {
            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
            scaleType = PreviewView.ScaleType.FILL_CENTER
        }

        container.addView(
            previewView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )

        val activity = context.currentActivity

        StructuredLogger.log("CameraNativeViewManager", 0, "CREATE_VIEW",
            "FrameLayout container created with RN layout fix, activity=${activity?.javaClass?.simpleName}, isLifecycleOwner=${activity is LifecycleOwner}")

        if (activity is LifecycleOwner) {
            CameraEngineTurboModule.getInstance()?.attachPreviewView(previewView, activity)
        } else {
            StructuredLogger.warn("CameraNativeViewManager", "NO_LIFECYCLE_OWNER",
                "Current activity is not a LifecycleOwner, camera preview will not work")
        }

        return container
    }

    override fun onDropViewInstance(view: FrameLayout) {
        StructuredLogger.log("CameraNativeViewManager", 0, "DROP_VIEW", "Camera container dropped from React tree")
        super.onDropViewInstance(view)
    }
}
