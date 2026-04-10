package com.pomodoro.ui.stats

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pomodoro.data.model.Session
import com.pomodoro.data.model.SessionType
import com.pomodoro.data.remote.FirestoreRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.ZoneId
import javax.inject.Inject

data class DailyStats(val date: LocalDate, val sessions: Int, val minutes: Int)

data class StatsUiState(
    val todaySessions: Int = 0,
    val todayMinutes: Int = 0,
    val weekSessions: Int = 0,
    val weekMinutes: Int = 0,
    val streakDays: Int = 0,
    val dailyStats: List<DailyStats> = emptyList(),
    val byTag: Map<String, Int> = emptyMap(),
    val byProject: Map<String, Int> = emptyMap(),
    val allSessions: List<Session> = emptyList(),
)

@HiltViewModel
class StatsViewModel @Inject constructor(
    private val firestoreRepo: FirestoreRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(StatsUiState())
    val state: StateFlow<StatsUiState> = _state

    init {
        viewModelScope.launch {
            firestoreRepo.observeRecentSessions(limit = 500)
                .catch { /* user signed out */ }
                .collect { sessions -> _state.value = computeStats(sessions) }
        }
    }

    private fun computeStats(sessions: List<Session>): StatsUiState {
        val zone = ZoneId.systemDefault()
        val today = LocalDate.now(zone)
        val weekStart = today.minusDays(6)

        val workSessions = sessions.filter { it.type == SessionType.WORK && it.completed }

        val todaySessions = workSessions.filter {
            it.startedAt.atZone(zone).toLocalDate() == today
        }
        val weekSessions = workSessions.filter {
            !it.startedAt.atZone(zone).toLocalDate().isBefore(weekStart)
        }

        val dailyStats = (0..6).map { daysAgo ->
            val date = today.minusDays(daysAgo.toLong())
            val daySessions = workSessions.filter {
                it.startedAt.atZone(zone).toLocalDate() == date
            }
            DailyStats(date, daySessions.size, daySessions.sumOf { it.duration })
        }.reversed()

        var streak = 0
        var checkDate = today
        while (true) {
            val hasSessions = workSessions.any { it.startedAt.atZone(zone).toLocalDate() == checkDate }
            if (!hasSessions) break
            streak++
            checkDate = checkDate.minusDays(1)
        }

        val byTag = workSessions.flatMap { s -> s.tags.map { it to s.duration } }
            .groupBy({ it.first }, { it.second })
            .mapValues { it.value.sum() }

        val byProject = workSessions.filter { it.projectName.isNotBlank() }
            .groupBy { it.projectName }
            .mapValues { it.value.sumOf { s -> s.duration } }

        return StatsUiState(
            todaySessions = todaySessions.size,
            todayMinutes = todaySessions.sumOf { it.duration },
            weekSessions = weekSessions.size,
            weekMinutes = weekSessions.sumOf { it.duration },
            streakDays = streak,
            dailyStats = dailyStats,
            byTag = byTag,
            byProject = byProject,
            allSessions = sessions,
        )
    }

    fun exportToCsv(): String {
        val header = "id,type,presetId,projectName,tags,startedAt,endedAt,duration,completed\n"
        val rows = _state.value.allSessions.joinToString("\n") { s ->
            "${s.id},${s.type},${s.presetId},\"${s.projectName}\",\"${s.tags.joinToString(";")}\",${s.startedAt},${s.endedAt},${s.duration},${s.completed}"
        }
        return header + rows
    }
}
