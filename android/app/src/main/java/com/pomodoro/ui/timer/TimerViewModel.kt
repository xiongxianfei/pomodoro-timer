package com.pomodoro.ui.timer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.pomodoro.data.model.*
import com.pomodoro.data.remote.FirestoreRepository
import com.pomodoro.domain.timer.TimerEngine
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
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

    private val _presets = MutableStateFlow<List<Preset>>(BUILT_IN_PRESETS)
    val presets: StateFlow<List<Preset>> = _presets

    private val _selectedPreset = MutableStateFlow<Preset?>(BUILT_IN_PRESETS.first())
    val selectedPreset: StateFlow<Preset?> = _selectedPreset

    private val ticker: Flow<Unit> = flow {
        while (true) {
            emit(Unit)
            delay(1_000)
        }
    }

    val remainingSeconds: StateFlow<Long> = combine(_timerState, _selectedPreset, ticker) { state, preset, _ ->
        val duration = preset?.let { timerEngine.totalDurationForState(state, it) } ?: 1500L
        timerEngine.remainingSeconds(state, duration)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 1500L)

    init {
        viewModelScope.launch {
            firestoreRepo.observePresets()
                .catch { /* user signed out, flow closed cleanly */ }
                .collect { presets ->
                    if (presets.isEmpty()) {
                        BUILT_IN_PRESETS.forEach { firestoreRepo.writePreset(it) }
                    } else {
                        _presets.value = presets
                        if (_selectedPreset.value?.id !in presets.map { it.id }) {
                            _selectedPreset.value = presets.first()
                        }
                    }
                }
        }
        viewModelScope.launch {
            firestoreRepo.observeTimerState()
                .catch { /* user signed out, flow closed cleanly */ }
                .collect { state ->
                    if (state != null) {
                        _timerState.value = state
                        // Sync selected preset from remote state's presetId
                        val match = _presets.value.find { it.id == state.presetId }
                        if (match != null) _selectedPreset.value = match
                    }
                }
        }
    }

    fun selectPreset(preset: Preset) {
        _selectedPreset.value = preset
        // Persist selected preset so other devices sync to it
        val newState = _timerState.value.copy(presetId = preset.id)
        viewModelScope.launch { firestoreRepo.writeTimerState(newState, deviceId) }
    }

    fun start() {
        val preset = _selectedPreset.value ?: BUILT_IN_PRESETS.first()
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
        val preset = _selectedPreset.value ?: BUILT_IN_PRESETS.first()
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
            isBreak = false,
        )
        viewModelScope.launch { firestoreRepo.writeTimerState(newState, deviceId) }
    }

    fun completeSession(tags: List<String> = emptyList(), projectName: String = "") {
        val current = _timerState.value
        val preset = _selectedPreset.value ?: BUILT_IN_PRESETS.first()
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

    companion object {
        val BUILT_IN_PRESETS = listOf(
            Preset(
                id = "preset-standard",
                name = "Standard",
                workDuration = 25,
                shortBreakDuration = 5,
                longBreakDuration = 15,
                sessionsBeforeLongBreak = 4,
                color = "#E53935",
                icon = "timer",
                sortOrder = 0,
                builtIn = true,
            ),
            Preset(
                id = "preset-deep-work",
                name = "Deep Work",
                workDuration = 50,
                shortBreakDuration = 10,
                longBreakDuration = 30,
                sessionsBeforeLongBreak = 3,
                color = "#1E88E5",
                icon = "brain",
                sortOrder = 1,
                builtIn = true,
            ),
            Preset(
                id = "preset-quick-task",
                name = "Quick Task",
                workDuration = 15,
                shortBreakDuration = 3,
                longBreakDuration = 10,
                sessionsBeforeLongBreak = 4,
                color = "#43A047",
                icon = "bolt",
                sortOrder = 2,
                builtIn = true,
            ),
        )
    }
}
