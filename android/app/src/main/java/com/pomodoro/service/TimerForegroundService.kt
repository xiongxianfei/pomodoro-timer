package com.pomodoro.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Binder
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.pomodoro.data.model.TimerState
import com.pomodoro.data.model.TimerStatus
import com.pomodoro.domain.timer.TimerEngine
import com.pomodoro.ui.MainActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject

@AndroidEntryPoint
class TimerForegroundService : Service() {

    @Inject lateinit var timerEngine: TimerEngine

    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private var tickJob: Job? = null

    private val _remainingSeconds = MutableStateFlow(0L)
    val remainingSeconds: StateFlow<Long> = _remainingSeconds

    private var currentState: TimerState = TimerState()
    private var totalDuration: Long = 1500L

    inner class LocalBinder : Binder() {
        fun getService(): TimerForegroundService = this@TimerForegroundService
    }

    private val binder = LocalBinder()

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification("Ready"))
    }

    fun updateState(state: TimerState, totalDurationSeconds: Long) {
        currentState = state
        totalDuration = totalDurationSeconds
        tickJob?.cancel()
        if (state.status == TimerStatus.RUNNING) {
            tickJob = scope.launch {
                while (true) {
                    val remaining = timerEngine.remainingSeconds(currentState, totalDuration)
                    _remainingSeconds.value = remaining
                    updateNotification(formatTime(remaining))
                    if (remaining == 0L) break
                    delay(1_000)
                }
            }
        } else {
            _remainingSeconds.value = timerEngine.remainingSeconds(state, totalDurationSeconds)
            updateNotification(formatTime(_remainingSeconds.value))
        }
    }

    private fun formatTime(seconds: Long): String {
        val m = seconds / 60
        val s = seconds % 60
        return "%02d:%02d".format(m, s)
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID, "Timer", NotificationManager.IMPORTANCE_LOW
        ).apply { description = "Pomodoro timer countdown" }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun buildNotification(text: String): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pi = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Pomodoro Timer")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pi)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification(text: String) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIFICATION_ID, buildNotification(text))
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        const val CHANNEL_ID = "pomodoro_timer"
        const val NOTIFICATION_ID = 1001
    }
}
