package com.petalpath.camera.model

data class ModelMetadata(
    val modelName: String = "MoveNet Lightning",
    val modelVersion: String = "1.0",
    val inputResolutionWidth: Int = 192,
    val inputResolutionHeight: Int = 192,
    val keypointCount: Int = 17,
    val delegateType: String = "GPU", // "GPU", "NNAPI", or "CPU"
    val buildTimeMs: Long = System.currentTimeMillis()
)
