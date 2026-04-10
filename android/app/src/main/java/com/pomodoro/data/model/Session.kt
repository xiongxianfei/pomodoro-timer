package com.pomodoro.data.model

import java.time.Instant

data class Session(
    val id: String,
    val presetId: String,
    val tags: List<String>,
    val projectName: String,
    val startedAt: Instant,
    val endedAt: Instant,
    val duration: Int,               // actual minutes
    val type: SessionType,
    val completed: Boolean,
)
