package com.pomodoro.data.remote

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.pomodoro.data.model.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FirestoreRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val db: FirebaseFirestore,
) {
    private val uid get() = auth.currentUser?.uid ?: error("Not authenticated")
    private fun userRef() = db.collection("users").document(uid)

    // --- Timer State ---

    fun observeTimerState(): Flow<TimerState?> = callbackFlow {
        val listener = userRef().collection("timerState").document("timerState")
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val state = snapshot?.takeIf { it.exists() }?.let { doc ->
                    TimerState(
                        status = TimerStatus.valueOf(doc.getString("status") ?: "IDLE"),
                        presetId = doc.getString("presetId") ?: "",
                        startedAt = doc.getTimestamp("startedAt")?.let { Instant.ofEpochSecond(it.seconds) },
                        pausedAt = doc.getTimestamp("pausedAt")?.let { Instant.ofEpochSecond(it.seconds) },
                        elapsed = doc.getLong("elapsed") ?: 0L,
                        currentSession = (doc.getLong("currentSession") ?: 1L).toInt(),
                        totalSessions = (doc.getLong("totalSessions") ?: 4L).toInt(),
                        isBreak = doc.getBoolean("isBreak") ?: false,
                        updatedAt = doc.getTimestamp("updatedAt")?.let { Instant.ofEpochSecond(it.seconds) } ?: Instant.EPOCH,
                        updatedBy = doc.getString("updatedBy") ?: "",
                    )
                }
                trySend(state)
            }
        awaitClose { listener.remove() }
    }

    suspend fun writeTimerState(state: TimerState, deviceId: String) {
        val data = mutableMapOf<String, Any?>(
            "status" to state.status.name,
            "presetId" to state.presetId,
            "startedAt" to state.startedAt?.let { com.google.firebase.Timestamp(it.epochSecond, 0) },
            "pausedAt" to state.pausedAt?.let { com.google.firebase.Timestamp(it.epochSecond, 0) },
            "elapsed" to state.elapsed,
            "currentSession" to state.currentSession,
            "totalSessions" to state.totalSessions,
            "isBreak" to state.isBreak,
            "updatedAt" to FieldValue.serverTimestamp(),
            "updatedBy" to deviceId,
        )
        userRef().collection("timerState").document("timerState")
            .set(data, SetOptions.merge()).await()
    }

    // --- Sessions ---

    suspend fun writeSession(session: Session) {
        val data = mapOf(
            "presetId" to session.presetId,
            "tags" to session.tags,
            "projectName" to session.projectName,
            "startedAt" to com.google.firebase.Timestamp(session.startedAt.epochSecond, 0),
            "endedAt" to com.google.firebase.Timestamp(session.endedAt.epochSecond, 0),
            "duration" to session.duration,
            "type" to session.type.name,
            "completed" to session.completed,
        )
        userRef().collection("sessions").document(session.id).set(data).await()
        // Update tag counters if session is a completed work session
        if (session.completed && session.type == SessionType.WORK) {
            session.tags.forEach { tagName ->
                val tagId = tagName.lowercase().replace(" ", "-")
                userRef().collection("tags").document(tagId).set(
                    mapOf(
                        "name" to tagName,
                        "color" to "#888888",
                        "totalSessions" to FieldValue.increment(1),
                        "totalMinutes" to FieldValue.increment(session.duration.toLong()),
                    ),
                    SetOptions.merge()
                ).await()
            }
        }
    }

    // --- Presets ---

    fun observePresets(): Flow<List<Preset>> = callbackFlow {
        val listener = userRef().collection("presets")
            .orderBy("sortOrder")
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val presets = snapshot?.documents?.map { doc ->
                    Preset(
                        id = doc.id,
                        name = doc.getString("name") ?: "",
                        workDuration = (doc.getLong("workDuration") ?: 25L).toInt(),
                        shortBreakDuration = (doc.getLong("shortBreakDuration") ?: 5L).toInt(),
                        longBreakDuration = (doc.getLong("longBreakDuration") ?: 15L).toInt(),
                        sessionsBeforeLongBreak = (doc.getLong("sessionsBeforeLongBreak") ?: 4L).toInt(),
                        color = doc.getString("color") ?: "#E53935",
                        icon = doc.getString("icon") ?: "timer",
                        sortOrder = (doc.getLong("sortOrder") ?: 0L).toInt(),
                        builtIn = doc.getBoolean("builtIn") ?: false,
                    )
                } ?: emptyList()
                trySend(presets)
            }
        awaitClose { listener.remove() }
    }

    suspend fun writePreset(preset: Preset) {
        val data = mapOf(
            "name" to preset.name,
            "workDuration" to preset.workDuration,
            "shortBreakDuration" to preset.shortBreakDuration,
            "longBreakDuration" to preset.longBreakDuration,
            "sessionsBeforeLongBreak" to preset.sessionsBeforeLongBreak,
            "color" to preset.color,
            "icon" to preset.icon,
            "sortOrder" to preset.sortOrder,
            "builtIn" to preset.builtIn,
        )
        userRef().collection("presets").document(preset.id).set(data).await()
    }

    suspend fun deletePreset(presetId: String) {
        userRef().collection("presets").document(presetId).delete().await()
    }

    // --- Tags ---

    fun observeTags(): Flow<List<Tag>> = callbackFlow {
        val listener = userRef().collection("tags")
            .orderBy("name")
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val tags = snapshot?.documents?.map { doc ->
                    Tag(
                        id = doc.id,
                        name = doc.getString("name") ?: "",
                        color = doc.getString("color") ?: "#888888",
                        totalSessions = (doc.getLong("totalSessions") ?: 0L).toInt(),
                        totalMinutes = (doc.getLong("totalMinutes") ?: 0L).toInt(),
                    )
                } ?: emptyList()
                trySend(tags)
            }
        awaitClose { listener.remove() }
    }
}
