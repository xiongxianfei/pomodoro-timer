package com.pomodoro.data.local.dao

import androidx.room.*
import com.pomodoro.data.local.entity.SessionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SessionDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(session: SessionEntity)

    @Query("SELECT * FROM sessions WHERE startedAt >= :from AND startedAt <= :to ORDER BY startedAt DESC")
    suspend fun getSessionsBetween(from: Long, to: Long): List<SessionEntity>

    @Query("SELECT * FROM sessions ORDER BY startedAt DESC")
    fun observeAll(): Flow<List<SessionEntity>>

    @Query("SELECT * FROM sessions WHERE completed = 1 ORDER BY startedAt DESC LIMIT :limit")
    suspend fun getRecentCompleted(limit: Int = 50): List<SessionEntity>
}
