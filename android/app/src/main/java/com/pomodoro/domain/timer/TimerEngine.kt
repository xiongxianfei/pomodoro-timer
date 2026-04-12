package com.pomodoro.domain.timer

import com.pomodoro.data.model.Preset
import com.pomodoro.data.model.TimerState
import com.pomodoro.data.model.TimerStatus
import java.time.Instant
import javax.inject.Inject

class TimerEngine @Inject constructor() {

    /**
     * Returns remaining seconds for the current timer phase.
     * Formula:
     *   IDLE/PAUSED/BREAK: totalDuration - elapsed
     *   RUNNING: totalDuration - elapsed - (now - startedAt)
     */
    fun remainingSeconds(
        state: TimerState,
        totalDurationSeconds: Long,
        now: Instant = Instant.now(),
    ): Long {
        return when (state.status) {
            TimerStatus.IDLE, TimerStatus.PAUSED -> {
                (totalDurationSeconds - state.elapsed).coerceAtLeast(0)
            }
            TimerStatus.RUNNING, TimerStatus.BREAK -> {
                val runningFor = state.startedAt?.let { now.epochSecond - it.epochSecond } ?: 0L
                (totalDurationSeconds - state.elapsed - runningFor).coerceIn(0L, totalDurationSeconds)
            }
        }
    }

    fun isExpired(
        state: TimerState,
        totalDurationSeconds: Long,
        now: Instant = Instant.now(),
    ): Boolean = remainingSeconds(state, totalDurationSeconds, now) == 0L

    /**
     * Returns the total duration in seconds for the current phase based on preset config.
     */
    fun totalDurationForState(state: TimerState, preset: Preset): Long {
        return when {
            !state.isBreak -> preset.workDuration * 60L
            state.currentSession >= state.totalSessions -> preset.longBreakDuration * 60L
            else -> preset.shortBreakDuration * 60L
        }
    }
}
