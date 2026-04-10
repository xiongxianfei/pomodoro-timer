package com.pomodoro.data.local.dao

import androidx.room.*
import com.pomodoro.data.local.entity.PresetEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PresetDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(presets: List<PresetEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(preset: PresetEntity)

    @Query("SELECT * FROM presets ORDER BY sortOrder ASC")
    fun observeAll(): Flow<List<PresetEntity>>

    @Query("SELECT * FROM presets WHERE id = :id")
    suspend fun getById(id: String): PresetEntity?

    @Query("DELETE FROM presets WHERE id = :id AND builtIn = 0")
    suspend fun deleteIfNotBuiltIn(id: String)
}
