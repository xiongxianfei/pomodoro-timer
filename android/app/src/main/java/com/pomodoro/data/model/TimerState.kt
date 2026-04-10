package com.pomodoro.data.model

import java.time.Instant

data class TimerState(
    val status: TimerStatus = TimerStatus.IDLE,
    val presetId: String = "",
    val startedAt: Instant? = null,
    val pausedAt: Instant? = null,
    val elapsed: Long = 0L,              // seconds already elapsed
    val currentSession: Int = 1,
    val totalSessions: Int = 4,
    val isBreak: Boolean = false,
    val updatedAt: Instant = Instant.EPOCH,
    val updatedBy: String = "",
)
