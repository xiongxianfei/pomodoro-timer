package com.pomodoro.data.model

data class Tag(
    val id: String,
    val name: String,
    val color: String,
    val totalSessions: Int,
    val totalMinutes: Int,
)
