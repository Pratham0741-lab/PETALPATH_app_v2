package com.petalpath.camera.calibration

import com.petalpath.camera.filter.FilteredPose

data class CalibratedPose(
    val filteredPose: FilteredPose,
    val calibrationData: CalibrationData
)
