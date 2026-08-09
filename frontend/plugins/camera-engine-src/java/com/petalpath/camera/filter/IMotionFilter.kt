package com.petalpath.camera.filter

import com.petalpath.camera.pose.TrackedPose

interface IMotionFilter {
    fun filter(trackedPose: TrackedPose): FilteredPose
    fun reset()
}
