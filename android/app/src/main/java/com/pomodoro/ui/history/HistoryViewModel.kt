package com.pomodoro.ui.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pomodoro.data.model.Session
import com.pomodoro.data.remote.FirestoreRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val firestoreRepo: FirestoreRepository,
) : ViewModel() {

    private val _sessions = MutableStateFlow<List<Session>>(emptyList())
    val sessions: StateFlow<List<Session>> = _sessions

    init {
        viewModelScope.launch {
            firestoreRepo.observeRecentSessions(limit = 100).collect { sessions ->
                _sessions.value = sessions
            }
        }
    }
}
