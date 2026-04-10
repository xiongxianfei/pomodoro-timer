package com.pomodoro.ui.timer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.pomodoro.data.model.*
import com.pomodoro.data.remote.FirestoreRepository
import com.pomodoro.domain.timer.TimerEngine
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.Instant
import java.util.UUID
import javax.inject.Inject
import javax.inject.Named

@HiltViewModel
class TimerViewModel @Inject constructor(
    private val firestoreRepo: FirestoreRepository,
    private val timerEngine: TimerEngine,
    private val auth: FirebaseAuth,
    @Named("deviceId") private val deviceId: String,
) : ViewModel() {

    private val _timerState = MutableStateFlow(TimerState())
    val timerState: StateFlow<TimerState> = _timerState

    private val _presets = MutableStateFlow<List<Preset>>(emptyList())
    val presets: StateFlow<List<Preset>> = _presets

    private val _selectedPreset = MutableStateFlow<Preset?>(null)
    val selectedPreset: StateFlow<Preset?> = _selectedPreset

    val remainingSeconds: StateFlow<Long> = combine(_timerState, _selectedPreset) { state, preset ->
        val duration = preset?.let { timerEngine.totalDurationForState(state, it) } ?: 1500L
        timerEngine.remainingSeconds(state, duration)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 1500L)

    init {
        viewModelScope.launch {
            firestoreRepo.observePresets().collect { presets ->
                _presets.value = presets
                if (_selectedPreset.value == null && presets.isNotEmpty()) {
                    _selectedPreset.value = presets.first()
                }
            }
        }
        viewModelScope.launch {
            firestoreRepo.observeTimerState().collect { state ->
                if (state != null) _timerState.value = state
            }
        }
    }

    fun selectPreset(preset: Preset) { _selectedPreset.value = preset }

    fun start() {
        val preset = _selectedPreset.value ?: return
        val current = _timerState.value
        val newState = current.copy(
            status = TimerStatus.RUNNING,
            presetId = preset.id,
            startedAt = Instant.now(),
            elapsed = 0,
            totalSessions = preset.sessionsBeforeLongBreak,
        )
        viewModelScope.launch { firestoreRepo.writeTimerState(newState, deviceId) }
    }

    fun pause() {
        val current = _timerState.value
        val preset = _selectedPreset.value ?: return
        val totalDuration = timerEngine.totalDurationForState(current, preset)
        val elapsed = totalDuration - timerEngine.remainingSeconds(current, totalDuration)
        val newState = current.copy(
            status = TimerStatus.PAUSED,
            pausedAt = Instant.now(),
            elapsed = elapsed,
        )
        viewModelScope.launch { firestoreRepo.writeTimerState(newState, deviceId) }
    }

    fun resume() {
        val current = _timerState.value
        val newState = current.copy(
            status = TimerStatus.RUNNING,
            startedAt = Instant.now(),
            pausedAt = null,
        )
        viewModelScope.launch { firestoreRepo.writeTimerState(newState, deviceId) }
    }

    fun stop() {
        val newState = _timerState.value.copy(
            status = TimerStatus.IDLE,
            elapsed = 0,
            startedAt = null,
            pausedAt = null,
        )
        viewModelScope.launch { firestoreRepo.writeTimerState(newState, deviceId) }
    }

    fun completeSession(tags: List<String> = emptyList(), projectName: String = "") {
        val current = _timerState.value
        val preset = _selectedPreset.value ?: return
        val session = Session(
            id = UUID.randomUUID().toString(),
            presetId = preset.id,
            tags = tags,
            projectName = projectName,
            startedAt = current.startedAt ?: Instant.now(),
            endedAt = Instant.now(),
            duration = preset.workDuration,
            type = SessionType.WORK,
            completed = true,
        )
        val nextSession = if (current.currentSession >= current.totalSessions) 1 else current.currentSession + 1
        val breakState = current.copy(
            status = TimerStatus.BREAK,
            isBreak = true,
            currentSession = nextSession,
            elapsed = 0,
            startedAt = Instant.now(),
        )
        viewModelScope.launch {
            firestoreRepo.writeSession(session)
            firestoreRepo.writeTimerState(breakState, deviceId)
        }
    }
}
