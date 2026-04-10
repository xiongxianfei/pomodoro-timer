package com.pomodoro.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sessions")
data class SessionEntity(
    @PrimaryKey val id: String,
    val presetId: String,
    val tags: String,              // comma-separated tag names
    val projectName: String,
    val startedAt: Long,           // epoch seconds
    val endedAt: Long,             // epoch seconds
    val duration: Int,             // minutes
    val type: String,              // "WORK", "SHORT_BREAK", "LONG_BREAK"
    val completed: Boolean,
)
