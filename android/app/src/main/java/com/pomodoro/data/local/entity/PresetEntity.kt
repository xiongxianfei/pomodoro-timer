package com.pomodoro.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "presets")
data class PresetEntity(
    @PrimaryKey val id: String,
    val name: String,
    val workDuration: Int,
    val shortBreakDuration: Int,
    val longBreakDuration: Int,
    val sessionsBeforeLongBreak: Int,
    val color: String,
    val icon: String,
    val sortOrder: Int,
    val builtIn: Boolean,
)
