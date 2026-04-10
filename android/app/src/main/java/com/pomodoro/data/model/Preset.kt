package com.pomodoro.data.model

data class Preset(
    val id: String,
    val name: String,
    val workDuration: Int,           // minutes
    val shortBreakDuration: Int,     // minutes
    val longBreakDuration: Int,      // minutes
    val sessionsBeforeLongBreak: Int,
    val color: String,               // hex, e.g. "#E53935"
    val icon: String,
    val sortOrder: Int,
    val builtIn: Boolean,
)
