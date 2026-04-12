package com.pomodoro.ui.presets

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pomodoro.data.model.Preset
import com.pomodoro.data.remote.FirestoreRepository
import com.pomodoro.ui.timer.TimerViewModel.Companion.BUILT_IN_PRESETS
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class PresetsViewModel @Inject constructor(
    private val firestoreRepo: FirestoreRepository,
) : ViewModel() {

    private val _presets = MutableStateFlow<List<Preset>>(BUILT_IN_PRESETS)
    val presets: StateFlow<List<Preset>> = _presets

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    init {
        viewModelScope.launch {
            firestoreRepo.observePresets()
                .catch { /* signed out */ }
                .collect { presets ->
                    if (presets.isEmpty()) {
                        BUILT_IN_PRESETS.forEach { firestoreRepo.writePreset(it) }
                    } else {
                        _presets.value = presets
                    }
                }
        }
    }

    fun savePreset(
        id: String?,
        name: String,
        workDuration: Int,
        shortBreakDuration: Int,
        longBreakDuration: Int,
        sessionsBeforeLongBreak: Int,
    ) {
        val existing = if (id != null) _presets.value.find { it.id == id } else null
        val preset = Preset(
            id = id ?: UUID.randomUUID().toString(),
            name = name.trim(),
            workDuration = workDuration,
            shortBreakDuration = shortBreakDuration,
            longBreakDuration = longBreakDuration,
            sessionsBeforeLongBreak = sessionsBeforeLongBreak,
            color = existing?.color ?: "#E53935",
            icon = existing?.icon ?: "timer",
            sortOrder = existing?.sortOrder ?: (_presets.value.maxOfOrNull { it.sortOrder } ?: 0) + 1,
            builtIn = false,
        )
        viewModelScope.launch {
            runCatching { firestoreRepo.writePreset(preset) }
                .onFailure { _error.value = "Failed to save preset: ${it.message}" }
        }
    }

    fun deletePreset(presetId: String) {
        viewModelScope.launch {
            runCatching { firestoreRepo.deletePreset(presetId) }
                .onFailure { _error.value = "Failed to delete preset: ${it.message}" }
        }
    }

    fun clearError() {
        _error.value = null
    }
}
