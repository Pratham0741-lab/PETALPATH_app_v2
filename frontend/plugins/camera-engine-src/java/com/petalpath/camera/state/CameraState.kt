package com.petalpath.camera.state

enum class CameraState {
    UNINITIALIZED,
    INITIALIZING,
    READY,
    RUNNING,
    PAUSED,
    STOPPING,
    STOPPED,
    ERROR
}
