package com.pomodoro.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.pomodoro.data.local.dao.PresetDao
import com.pomodoro.data.local.dao.SessionDao
import com.pomodoro.data.local.dao.TagDao
import com.pomodoro.data.local.entity.PresetEntity
import com.pomodoro.data.local.entity.SessionEntity
import com.pomodoro.data.local.entity.TagEntity

@Database(
    entities = [SessionEntity::class, PresetEntity::class, TagEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class PomodoroDatabase : RoomDatabase() {
    abstract fun sessionDao(): SessionDao
    abstract fun presetDao(): PresetDao
    abstract fun tagDao(): TagDao
}
