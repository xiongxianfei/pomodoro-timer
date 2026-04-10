package com.pomodoro.data.local

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.pomodoro.data.local.dao.SessionDao
import com.pomodoro.data.local.entity.SessionEntity
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.time.Instant

@RunWith(AndroidJUnit4::class)
class SessionDaoTest {

    private lateinit var db: PomodoroDatabase
    private lateinit var dao: SessionDao

    @Before
    fun setup() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        db = Room.inMemoryDatabaseBuilder(context, PomodoroDatabase::class.java).build()
        dao = db.sessionDao()
    }

    @After
    fun teardown() { db.close() }

    @Test
    fun insertAndQuerySessionsByDateRange() = runTest {
        val now = Instant.now()
        val session = SessionEntity(
            id = "s1",
            presetId = "preset-standard",
            tags = "work,focus",
            projectName = "My Project",
            startedAt = now.epochSecond,
            endedAt = now.plusSeconds(1500).epochSecond,
            duration = 25,
            type = "WORK",
            completed = true,
        )
        dao.insert(session)

        val results = dao.getSessionsBetween(
            from = now.minusSeconds(60).epochSecond,
            to = now.plusSeconds(3600).epochSecond,
        )
        assertEquals(1, results.size)
        assertEquals("s1", results[0].id)
    }

    @Test
    fun queryReturnsEmptyForOutOfRangeDates() = runTest {
        val now = Instant.now()
        val session = SessionEntity(
            id = "s2",
            presetId = "preset-standard",
            tags = "",
            projectName = "",
            startedAt = now.epochSecond,
            endedAt = now.plusSeconds(1500).epochSecond,
            duration = 25,
            type = "WORK",
            completed = true,
        )
        dao.insert(session)

        val results = dao.getSessionsBetween(
            from = now.plusSeconds(7200).epochSecond,
            to = now.plusSeconds(10000).epochSecond,
        )
        assertEquals(0, results.size)
    }
}
