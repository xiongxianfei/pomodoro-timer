package com.pomodoro.domain.timer

import com.pomodoro.data.model.TimerState
import com.pomodoro.data.model.TimerStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class TimerEngineTest {

    private val engine = TimerEngine()

    @Test
    fun `remainingSeconds returns totalDuration when idle`() {
        val state = TimerState(status = TimerStatus.IDLE, elapsed = 0)
        val remaining = engine.remainingSeconds(state, totalDurationSeconds = 1500)
        assertEquals(1500L, remaining)
    }

    @Test
    fun `remainingSeconds returns totalDuration minus elapsed when paused`() {
        val state = TimerState(status = TimerStatus.PAUSED, elapsed = 300)
        val remaining = engine.remainingSeconds(state, totalDurationSeconds = 1500)
        assertEquals(1200L, remaining)
    }

    @Test
    fun `remainingSeconds accounts for time since startedAt when running`() {
        val startedAt = Instant.now().minusSeconds(120)
        val state = TimerState(
            status = TimerStatus.RUNNING,
            startedAt = startedAt,
            elapsed = 60,
        )
        val remaining = engine.remainingSeconds(state, totalDurationSeconds = 1500, now = Instant.now())
        // elapsed=60, running for 120s more → total used = 180, remaining ≈ 1320
        assertTrue("Expected ~1320 but got $remaining", remaining in 1318..1322)
    }

    @Test
    fun `remainingSeconds returns 0 when time has expired`() {
        val startedAt = Instant.now().minusSeconds(1600)
        val state = TimerState(
            status = TimerStatus.RUNNING,
            startedAt = startedAt,
            elapsed = 0,
        )
        val remaining = engine.remainingSeconds(state, totalDurationSeconds = 1500, now = Instant.now())
        assertEquals(0L, remaining)
    }

    @Test
    fun `isExpired returns true when remaining is zero`() {
        val startedAt = Instant.now().minusSeconds(1600)
        val state = TimerState(status = TimerStatus.RUNNING, startedAt = startedAt, elapsed = 0)
        assertTrue(engine.isExpired(state, totalDurationSeconds = 1500, now = Instant.now()))
    }

    @Test
    fun `totalDurationForState returns work duration when not a break`() {
        val preset = buildPreset(workDuration = 25)
        val state = TimerState(isBreak = false)
        assertEquals(25 * 60L, engine.totalDurationForState(state, preset))
    }

    @Test
    fun `totalDurationForState returns long break when session count matches`() {
        val preset = buildPreset(shortBreakDuration = 5, longBreakDuration = 15, sessionsBeforeLongBreak = 4)
        val state = TimerState(isBreak = true, currentSession = 4, totalSessions = 4)
        assertEquals(15 * 60L, engine.totalDurationForState(state, preset))
    }

    @Test
    fun `totalDurationForState returns short break otherwise`() {
        val preset = buildPreset(shortBreakDuration = 5, longBreakDuration = 15, sessionsBeforeLongBreak = 4)
        val state = TimerState(isBreak = true, currentSession = 2, totalSessions = 4)
        assertEquals(5 * 60L, engine.totalDurationForState(state, preset))
    }

    private fun buildPreset(
        workDuration: Int = 25,
        shortBreakDuration: Int = 5,
        longBreakDuration: Int = 15,
        sessionsBeforeLongBreak: Int = 4,
    ) = com.pomodoro.data.model.Preset(
        id = "test",
        name = "Test",
        workDuration = workDuration,
        shortBreakDuration = shortBreakDuration,
        longBreakDuration = longBreakDuration,
        sessionsBeforeLongBreak = sessionsBeforeLongBreak,
        color = "#000",
        icon = "timer",
        sortOrder = 0,
        builtIn = false,
    )
}
