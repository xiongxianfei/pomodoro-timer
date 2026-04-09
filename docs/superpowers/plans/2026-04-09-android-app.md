# Android App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native Android Pomodoro timer app (Kotlin + Jetpack Compose) that syncs timer state and session history with Firebase in real-time.

**Architecture:** Single-activity Jetpack Compose app using MVVM + Repository pattern. A foreground service keeps the timer running when backgrounded. Room caches data locally for offline use. Hilt provides dependency injection throughout. Firebase SDK handles Auth and Firestore sync.

**Tech Stack:** Kotlin, Jetpack Compose, Material 3, Hilt, Room, Firebase Android SDK (Auth + Firestore), JUnit 4, Mockito, Compose UI Testing

**Prerequisite:** Firebase project configured per `docs/superpowers/plans/2026-04-09-firebase-setup.md`. Firebase emulator running on `localhost:8080` (Firestore) and `localhost:9099` (Auth).

---

## File Structure

```
android/
  build.gradle.kts                      # Root build config
  settings.gradle.kts
  gradle/libs.versions.toml             # Version catalog
  app/
    build.gradle.kts                    # App module dependencies
    google-services.json                # Firebase config (not committed — download from console)
    src/
      main/
        AndroidManifest.xml
        java/com/pomodoro/
          PomodoroApp.kt                # @HiltAndroidApp Application class
          di/
            AppModule.kt               # Provides Room, device ID, coroutine scopes
            FirebaseModule.kt          # Provides FirebaseAuth, FirebaseFirestore
          data/
            model/
              Preset.kt               # Data class (domain model)
              TimerState.kt           # Data class (domain model)
              Session.kt              # Data class (domain model)
              Tag.kt                  # Data class (domain model)
              TimerStatus.kt          # Enum: IDLE, RUNNING, PAUSED, BREAK
              SessionType.kt          # Enum: WORK, SHORT_BREAK, LONG_BREAK
            local/
              PomodoroDatabase.kt     # Room @Database
              dao/
                SessionDao.kt
                PresetDao.kt
                TagDao.kt
              entity/
                SessionEntity.kt      # Room @Entity
                PresetEntity.kt
                TagEntity.kt
              mapper/
                SessionMapper.kt      # Entity <-> domain model
                PresetMapper.kt
                TagMapper.kt
            remote/
              FirestoreRepository.kt  # All Firestore reads/writes
          domain/
            timer/
              TimerEngine.kt          # Pure countdown logic — no Android deps
          repository/
            TimerRepository.kt        # Coordinates local + remote timer state
            SessionRepository.kt      # Coordinates local + remote sessions
            PresetRepository.kt       # Coordinates local + remote presets
            StatsRepository.kt        # Queries sessions for stats
          service/
            TimerForegroundService.kt # Keeps timer alive when backgrounded
            TimerServiceConnection.kt # Binder/connection helper
          ui/
            MainActivity.kt
            auth/
              AuthScreen.kt
              AuthViewModel.kt
            timer/
              TimerScreen.kt
              TimerViewModel.kt
            history/
              HistoryScreen.kt
              HistoryViewModel.kt
            stats/
              StatsScreen.kt
              StatsViewModel.kt
            presets/
              PresetsScreen.kt
              PresetsViewModel.kt
            theme/
              Theme.kt
              Color.kt
              Type.kt
      test/
        java/com/pomodoro/
          domain/timer/TimerEngineTest.kt
          repository/TimerRepositoryTest.kt
          repository/SessionRepositoryTest.kt
          repository/StatsRepositoryTest.kt
      androidTest/
        java/com/pomodoro/
          ui/timer/TimerScreenTest.kt
          data/local/SessionDaoTest.kt
```

---

### Task 1: Scaffold Android Project

**Files:**
- Create: `android/settings.gradle.kts`
- Create: `android/build.gradle.kts`
- Create: `android/gradle/libs.versions.toml`
- Create: `android/app/build.gradle.kts`
- Create: `android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: Create the Android project**

Open Android Studio → New Project → "Empty Activity":
- Name: `Pomodoro Timer`
- Package name: `com.pomodoro`
- Save location: `D:/Data/20260409-pomodoro-timer/android`
- Language: Kotlin
- Minimum SDK: API 26 (Android 8.0)
- Build configuration language: Kotlin DSL

Click Finish and wait for Gradle sync.

- [ ] **Step 2: Replace libs.versions.toml with full version catalog**

Replace `android/gradle/libs.versions.toml`:

```toml
[versions]
agp = "8.4.0"
kotlin = "1.9.23"
compose-bom = "2024.05.00"
hilt = "2.51.1"
room = "2.6.1"
firebase-bom = "33.1.0"
coroutines = "1.8.0"
lifecycle = "2.8.0"
navigation = "2.7.7"
junit = "4.13.2"
mockito = "5.11.0"
mockito-kotlin = "5.3.1"

[libraries]
compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "compose-bom" }
compose-ui = { group = "androidx.compose.ui", name = "ui" }
compose-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
compose-ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
compose-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
compose-ui-test-manifest = { group = "androidx.compose.ui", name = "ui-test-manifest" }
compose-ui-test-junit4 = { group = "androidx.compose.ui", name = "ui-test-junit4" }
compose-material3 = { group = "androidx.compose.material3", name = "material3" }
compose-activity = { group = "androidx.activity", name = "activity-compose", version = "1.9.0" }
compose-navigation = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigation" }
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-android-compiler", version.ref = "hilt" }
hilt-navigation-compose = { group = "androidx.hilt", name = "hilt-navigation-compose", version = "1.2.0" }
room-runtime = { group = "androidx.room", name = "room-runtime", version.ref = "room" }
room-ktx = { group = "androidx.room", name = "room-ktx", version.ref = "room" }
room-compiler = { group = "androidx.room", name = "room-compiler", version.ref = "room" }
room-testing = { group = "androidx.room", name = "room-testing", version.ref = "room" }
firebase-bom = { group = "com.google.firebase", name = "firebase-bom", version.ref = "firebase-bom" }
firebase-auth = { group = "com.google.firebase", name = "firebase-auth-ktx" }
firebase-firestore = { group = "com.google.firebase", name = "firebase-firestore-ktx" }
coroutines-android = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-android", version.ref = "coroutines" }
coroutines-test = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-test", version.ref = "coroutines" }
lifecycle-viewmodel = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-ktx", version.ref = "lifecycle" }
lifecycle-runtime = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycle" }
lifecycle-runtime-compose = { group = "androidx.lifecycle", name = "lifecycle-runtime-compose", version.ref = "lifecycle" }
junit = { group = "junit", name = "junit", version.ref = "junit" }
mockito-core = { group = "org.mockito", name = "mockito-core", version.ref = "mockito" }
mockito-kotlin = { group = "org.mockito.kotlin", name = "mockito-kotlin", version.ref = "mockito-kotlin" }
google-services-play-auth = { group = "com.google.android.gms", name = "play-services-auth", version = "21.2.0" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-kapt = { id = "org.jetbrains.kotlin.kapt", version.ref = "kotlin" }
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
google-services = { id = "com.google.gms.google-services", version = "4.4.1" }
```

- [ ] **Step 3: Update app/build.gradle.kts**

Replace `android/app/build.gradle.kts`:

```kotlin
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.kapt)
    alias(libs.plugins.hilt)
    alias(libs.plugins.google.services)
}

android {
    namespace = "com.pomodoro"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.pomodoro"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables { useSupportLibrary = true }
    }

    buildTypes {
        debug {
            buildConfigField("Boolean", "USE_EMULATOR", "true")
        }
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            buildConfigField("Boolean", "USE_EMULATOR", "false")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions { jvmTarget = "17" }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    composeOptions { kotlinCompilerExtensionVersion = "1.5.13" }
}

dependencies {
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.activity)
    implementation(libs.compose.navigation)
    implementation(libs.lifecycle.viewmodel)
    implementation(libs.lifecycle.runtime)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.hilt.android)
    kapt(libs.hilt.compiler)
    implementation(libs.hilt.navigation.compose)
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    kapt(libs.room.compiler)
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.auth)
    implementation(libs.firebase.firestore)
    implementation(libs.coroutines.android)
    implementation(libs.google.services.play.auth)

    testImplementation(libs.junit)
    testImplementation(libs.mockito.core)
    testImplementation(libs.mockito.kotlin)
    testImplementation(libs.coroutines.test)
    testImplementation(libs.room.testing)
    androidTestImplementation(platform(libs.compose.bom))
    androidTestImplementation(libs.compose.ui.test.junit4)
    debugImplementation(libs.compose.ui.tooling)
    debugImplementation(libs.compose.ui.test.manifest)
}
```

- [ ] **Step 4: Sync Gradle and verify the build**

In Android Studio: File → Sync Project with Gradle Files

Then run:

```bash
cd android
./gradlew assembleDebug
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 5: Download google-services.json**

In Firebase Console → Project Settings → Your apps → Add app → Android:
- Package name: `com.pomodoro`
- Download `google-services.json`
- Place it at `android/app/google-services.json`

Add to `.gitignore` at project root:

```
android/app/google-services.json
```

- [ ] **Step 6: Commit scaffold**

```bash
git add android/ .gitignore
git commit -m "chore: scaffold Android project with Compose, Hilt, Room, Firebase"
```

---

### Task 2: Define Domain Models

**Files:**
- Create: `android/app/src/main/java/com/pomodoro/data/model/TimerStatus.kt`
- Create: `android/app/src/main/java/com/pomodoro/data/model/SessionType.kt`
- Create: `android/app/src/main/java/com/pomodoro/data/model/Preset.kt`
- Create: `android/app/src/main/java/com/pomodoro/data/model/TimerState.kt`
- Create: `android/app/src/main/java/com/pomodoro/data/model/Session.kt`
- Create: `android/app/src/main/java/com/pomodoro/data/model/Tag.kt`

- [ ] **Step 1: Write enums**

`TimerStatus.kt`:

```kotlin
package com.pomodoro.data.model

enum class TimerStatus { IDLE, RUNNING, PAUSED, BREAK }
```

`SessionType.kt`:

```kotlin
package com.pomodoro.data.model

enum class SessionType { WORK, SHORT_BREAK, LONG_BREAK }
```

- [ ] **Step 2: Write Preset model**

`Preset.kt`:

```kotlin
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
```

- [ ] **Step 3: Write TimerState model**

`TimerState.kt`:

```kotlin
package com.pomodoro.data.model

import java.time.Instant

data class TimerState(
    val status: TimerStatus = TimerStatus.IDLE,
    val presetId: String = "",
    val startedAt: Instant? = null,
    val pausedAt: Instant? = null,
    val elapsed: Long = 0L,              // seconds already elapsed
    val currentSession: Int = 1,
    val totalSessions: Int = 4,
    val isBreak: Boolean = false,
    val updatedAt: Instant = Instant.EPOCH,
    val updatedBy: String = "",
)
```

- [ ] **Step 4: Write Session model**

`Session.kt`:

```kotlin
package com.pomodoro.data.model

import java.time.Instant

data class Session(
    val id: String,
    val presetId: String,
    val tags: List<String>,
    val projectName: String,
    val startedAt: Instant,
    val endedAt: Instant,
    val duration: Int,               // actual minutes
    val type: SessionType,
    val completed: Boolean,
)
```

- [ ] **Step 5: Write Tag model**

`Tag.kt`:

```kotlin
package com.pomodoro.data.model

data class Tag(
    val id: String,
    val name: String,
    val color: String,
    val totalSessions: Int,
    val totalMinutes: Int,
)
```

- [ ] **Step 6: Commit models**

```bash
git add android/app/src/main/java/com/pomodoro/data/model/
git commit -m "feat: add domain models — Preset, TimerState, Session, Tag"
```

---

### Task 3: Implement TimerEngine (Pure Logic)

**Files:**
- Create: `android/app/src/main/java/com/pomodoro/domain/timer/TimerEngine.kt`
- Create: `android/app/src/test/java/com/pomodoro/domain/timer/TimerEngineTest.kt`

- [ ] **Step 1: Write failing tests**

`TimerEngineTest.kt`:

```kotlin
package com.pomodoro.domain.timer

import com.pomodoro.data.model.TimerState
import com.pomodoro.data.model.TimerStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class TimerEngineTest {

    private val engine = TimerEngine()

    @Test
    fun `remainingSeconds returns totalDuration when idle`() {
        val state = TimerState(status = TimerStatus.IDLE, elapsed = 0)
        val remaining = engine.remainingSeconds(state, totalDurationSeconds = 1500)
        assertEquals(1500L, remaining)
    }

    @Test
    fun `remainingSeconds returns totalDuration minus elapsed when paused`() {
        val state = TimerState(status = TimerStatus.PAUSED, elapsed = 300)
        val remaining = engine.remainingSeconds(state, totalDurationSeconds = 1500)
        assertEquals(1200L, remaining)
    }

    @Test
    fun `remainingSeconds accounts for time since startedAt when running`() {
        val startedAt = Instant.now().minusSeconds(120)
        val state = TimerState(
            status = TimerStatus.RUNNING,
            startedAt = startedAt,
            elapsed = 60,
        )
        val remaining = engine.remainingSeconds(state, totalDurationSeconds = 1500, now = Instant.now())
        // elapsed=60, running for 120s more → total used = 180, remaining ≈ 1320
        assertTrue("Expected ~1320 but got $remaining", remaining in 1318..1322)
    }

    @Test
    fun `remainingSeconds returns 0 when time has expired`() {
        val startedAt = Instant.now().minusSeconds(1600)
        val state = TimerState(
            status = TimerStatus.RUNNING,
            startedAt = startedAt,
            elapsed = 0,
        )
        val remaining = engine.remainingSeconds(state, totalDurationSeconds = 1500, now = Instant.now())
        assertEquals(0L, remaining)
    }

    @Test
    fun `isExpired returns true when remaining is zero`() {
        val startedAt = Instant.now().minusSeconds(1600)
        val state = TimerState(status = TimerStatus.RUNNING, startedAt = startedAt, elapsed = 0)
        assertTrue(engine.isExpired(state, totalDurationSeconds = 1500, now = Instant.now()))
    }

    @Test
    fun `totalDurationForState returns work duration when not a break`() {
        val preset = buildPreset(workDuration = 25)
        val state = TimerState(isBreak = false)
        assertEquals(25 * 60L, engine.totalDurationForState(state, preset))
    }

    @Test
    fun `totalDurationForState returns long break when session count matches`() {
        val preset = buildPreset(shortBreakDuration = 5, longBreakDuration = 15, sessionsBeforeLongBreak = 4)
        val state = TimerState(isBreak = true, currentSession = 4, totalSessions = 4)
        assertEquals(15 * 60L, engine.totalDurationForState(state, preset))
    }

    @Test
    fun `totalDurationForState returns short break otherwise`() {
        val preset = buildPreset(shortBreakDuration = 5, longBreakDuration = 15, sessionsBeforeLongBreak = 4)
        val state = TimerState(isBreak = true, currentSession = 2, totalSessions = 4)
        assertEquals(5 * 60L, engine.totalDurationForState(state, preset))
    }

    private fun buildPreset(
        workDuration: Int = 25,
        shortBreakDuration: Int = 5,
        longBreakDuration: Int = 15,
        sessionsBeforeLongBreak: Int = 4,
    ) = com.pomodoro.data.model.Preset(
        id = "test",
        name = "Test",
        workDuration = workDuration,
        shortBreakDuration = shortBreakDuration,
        longBreakDuration = longBreakDuration,
        sessionsBeforeLongBreak = sessionsBeforeLongBreak,
        color = "#000",
        icon = "timer",
        sortOrder = 0,
        builtIn = false,
    )
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd android
./gradlew :app:testDebugUnitTest --tests "com.pomodoro.domain.timer.TimerEngineTest"
```

Expected: FAILED — `TimerEngine` does not exist yet.

- [ ] **Step 3: Implement TimerEngine**

`TimerEngine.kt`:

```kotlin
package com.pomodoro.domain.timer

import com.pomodoro.data.model.Preset
import com.pomodoro.data.model.TimerState
import com.pomodoro.data.model.TimerStatus
import java.time.Instant
import javax.inject.Inject

class TimerEngine @Inject constructor() {

    /**
     * Returns remaining seconds for the current timer phase.
     * Formula:
     *   IDLE/PAUSED: totalDuration - elapsed
     *   RUNNING: totalDuration - elapsed - (now - startedAt)
     */
    fun remainingSeconds(
        state: TimerState,
        totalDurationSeconds: Long,
        now: Instant = Instant.now(),
    ): Long {
        return when (state.status) {
            TimerStatus.IDLE, TimerStatus.PAUSED, TimerStatus.BREAK -> {
                (totalDurationSeconds - state.elapsed).coerceAtLeast(0)
            }
            TimerStatus.RUNNING -> {
                val runningFor = state.startedAt?.let { now.epochSecond - it.epochSecond } ?: 0L
                (totalDurationSeconds - state.elapsed - runningFor).coerceAtLeast(0)
            }
        }
    }

    fun isExpired(
        state: TimerState,
        totalDurationSeconds: Long,
        now: Instant = Instant.now(),
    ): Boolean = remainingSeconds(state, totalDurationSeconds, now) == 0L

    /**
     * Returns the total duration in seconds for the current phase based on preset config.
     */
    fun totalDurationForState(state: TimerState, preset: Preset): Long {
        return when {
            !state.isBreak -> preset.workDuration * 60L
            state.currentSession >= state.totalSessions -> preset.longBreakDuration * 60L
            else -> preset.shortBreakDuration * 60L
        }
    }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
./gradlew :app:testDebugUnitTest --tests "com.pomodoro.domain.timer.TimerEngineTest"
```

Expected: `BUILD SUCCESSFUL`, all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/pomodoro/domain/ android/app/src/test/
git commit -m "feat: implement TimerEngine with full unit test coverage"
```

---

### Task 4: Set Up Room Database

**Files:**
- Create: `android/app/src/main/java/com/pomodoro/data/local/entity/SessionEntity.kt`
- Create: `android/app/src/main/java/com/pomodoro/data/local/entity/PresetEntity.kt`
- Create: `android/app/src/main/java/com/pomodoro/data/local/entity/TagEntity.kt`
- Create: `android/app/src/main/java/com/pomodoro/data/local/dao/SessionDao.kt`
- Create: `android/app/src/main/java/com/pomodoro/data/local/dao/PresetDao.kt`
- Create: `android/app/src/main/java/com/pomodoro/data/local/dao/TagDao.kt`
- Create: `android/app/src/main/java/com/pomodoro/data/local/PomodoroDatabase.kt`
- Create: `android/app/src/androidTest/java/com/pomodoro/data/local/SessionDaoTest.kt`

- [ ] **Step 1: Write SessionDaoTest (failing)**

`SessionDaoTest.kt`:

```kotlin
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
```

- [ ] **Step 2: Write Room entities**

`SessionEntity.kt`:

```kotlin
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
```

`PresetEntity.kt`:

```kotlin
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
```

`TagEntity.kt`:

```kotlin
package com.pomodoro.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "tags")
data class TagEntity(
    @PrimaryKey val id: String,
    val name: String,
    val color: String,
    val totalSessions: Int,
    val totalMinutes: Int,
)
```

- [ ] **Step 3: Write DAOs**

`SessionDao.kt`:

```kotlin
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
```

`PresetDao.kt`:

```kotlin
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
```

`TagDao.kt`:

```kotlin
package com.pomodoro.data.local.dao

import androidx.room.*
import com.pomodoro.data.local.entity.TagEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface TagDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(tags: List<TagEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(tag: TagEntity)

    @Query("SELECT * FROM tags ORDER BY name ASC")
    fun observeAll(): Flow<List<TagEntity>>
}
```

- [ ] **Step 4: Write PomodoroDatabase**

`PomodoroDatabase.kt`:

```kotlin
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
```

- [ ] **Step 5: Run the DAO test on an emulator or device**

```bash
./gradlew :app:connectedDebugAndroidTest --tests "com.pomodoro.data.local.SessionDaoTest"
```

Expected: All 2 tests pass.

- [ ] **Step 6: Commit Room setup**

```bash
git add android/app/src/main/java/com/pomodoro/data/local/ android/app/src/androidTest/
git commit -m "feat: set up Room database with Session, Preset, Tag DAOs"
```

---

### Task 5: Set Up Hilt DI

**Files:**
- Create: `android/app/src/main/java/com/pomodoro/PomodoroApp.kt`
- Create: `android/app/src/main/java/com/pomodoro/di/AppModule.kt`
- Create: `android/app/src/main/java/com/pomodoro/di/FirebaseModule.kt`

- [ ] **Step 1: Write PomodoroApp**

`PomodoroApp.kt`:

```kotlin
package com.pomodoro

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class PomodoroApp : Application()
```

- [ ] **Step 2: Update AndroidManifest.xml to reference PomodoroApp**

In `android/app/src/main/AndroidManifest.xml`, set:

```xml
<application
    android:name=".PomodoroApp"
    ...>
```

- [ ] **Step 3: Write AppModule**

`AppModule.kt`:

```kotlin
package com.pomodoro.di

import android.content.Context
import androidx.room.Room
import com.pomodoro.data.local.PomodoroDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import java.util.UUID
import javax.inject.Named
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): PomodoroDatabase =
        Room.databaseBuilder(context, PomodoroDatabase::class.java, "pomodoro_db").build()

    @Provides fun provideSessionDao(db: PomodoroDatabase) = db.sessionDao()
    @Provides fun providePresetDao(db: PomodoroDatabase) = db.presetDao()
    @Provides fun provideTagDao(db: PomodoroDatabase) = db.tagDao()

    @Provides
    @Named("deviceId")
    fun provideDeviceId(@ApplicationContext context: Context): String {
        val prefs = context.getSharedPreferences("pomodoro_prefs", Context.MODE_PRIVATE)
        return prefs.getString("device_id", null) ?: UUID.randomUUID().toString().also { id ->
            prefs.edit().putString("device_id", id).apply()
        }
    }
}
```

- [ ] **Step 4: Write FirebaseModule**

`FirebaseModule.kt`:

```kotlin
package com.pomodoro.di

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.ktx.auth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import com.pomodoro.BuildConfig
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object FirebaseModule {

    @Provides
    @Singleton
    fun provideFirebaseAuth(): FirebaseAuth = Firebase.auth.also { auth ->
        if (BuildConfig.USE_EMULATOR) {
            auth.useEmulator("10.0.2.2", 9099) // 10.0.2.2 = localhost from Android emulator
        }
    }

    @Provides
    @Singleton
    fun provideFirestore(): FirebaseFirestore = Firebase.firestore.also { db ->
        if (BuildConfig.USE_EMULATOR) {
            db.useEmulator("10.0.2.2", 8080)
        }
    }
}
```

- [ ] **Step 5: Build to verify Hilt compiles**

```bash
./gradlew :app:assembleDebug
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 6: Commit Hilt setup**

```bash
git add android/app/src/main/java/com/pomodoro/PomodoroApp.kt android/app/src/main/java/com/pomodoro/di/ android/app/src/main/AndroidManifest.xml
git commit -m "feat: set up Hilt DI with Room and Firebase providers"
```

---

### Task 6: Implement FirestoreRepository

**Files:**
- Create: `android/app/src/main/java/com/pomodoro/data/remote/FirestoreRepository.kt`

- [ ] **Step 1: Write FirestoreRepository**

`FirestoreRepository.kt`:

```kotlin
package com.pomodoro.data.remote

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.google.firebase.firestore.ktx.snapshots
import com.pomodoro.data.model.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.map
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
```

- [ ] **Step 2: Build to verify compilation**

```bash
./gradlew :app:assembleDebug
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 3: Commit**

```bash
git add android/app/src/main/java/com/pomodoro/data/remote/
git commit -m "feat: implement FirestoreRepository with real-time listeners"
```

---

### Task 7: Implement Google Sign-In and Auth UI

**Files:**
- Create: `android/app/src/main/java/com/pomodoro/ui/auth/AuthScreen.kt`
- Create: `android/app/src/main/java/com/pomodoro/ui/auth/AuthViewModel.kt`

- [ ] **Step 1: Write AuthViewModel**

`AuthViewModel.kt`:

```kotlin
package com.pomodoro.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

sealed class AuthState {
    object Loading : AuthState()
    object Authenticated : AuthState()
    object Unauthenticated : AuthState()
    data class Error(val message: String) : AuthState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val auth: FirebaseAuth,
) : ViewModel() {

    private val _state = MutableStateFlow<AuthState>(
        if (auth.currentUser != null) AuthState.Authenticated else AuthState.Unauthenticated
    )
    val state: StateFlow<AuthState> = _state

    fun signInWithGoogle(account: GoogleSignInAccount) {
        viewModelScope.launch {
            _state.value = AuthState.Loading
            try {
                val credential = GoogleAuthProvider.getCredential(account.idToken, null)
                auth.signInWithCredential(credential).await()
                _state.value = AuthState.Authenticated
            } catch (e: Exception) {
                _state.value = AuthState.Error(e.message ?: "Sign-in failed")
            }
        }
    }

    fun signOut() {
        auth.signOut()
        _state.value = AuthState.Unauthenticated
    }
}
```

- [ ] **Step 2: Write AuthScreen**

`AuthScreen.kt`:

```kotlin
package com.pomodoro.ui.auth

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.pomodoro.R

@Composable
fun AuthScreen(
    onAuthenticated: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    if (state == AuthState.Authenticated) {
        onAuthenticated()
        return
    }

    val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
        .requestIdToken(context.getString(R.string.default_web_client_id))
        .requestEmail()
        .build()
    val googleSignInClient = GoogleSignIn.getClient(context, gso)

    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
            val account = task.result
            if (account != null) viewModel.signInWithGoogle(account)
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Pomodoro Timer", style = MaterialTheme.typography.headlineLarge)
        Spacer(Modifier.height(16.dp))
        Text("Sign in to sync across devices", style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(48.dp))

        when (state) {
            is AuthState.Loading -> CircularProgressIndicator()
            is AuthState.Error -> {
                Text((state as AuthState.Error).message, color = MaterialTheme.colorScheme.error)
                Spacer(Modifier.height(16.dp))
                Button(onClick = { launcher.launch(googleSignInClient.signInIntent) }) {
                    Text("Sign in with Google")
                }
            }
            else -> {
                Button(onClick = { launcher.launch(googleSignInClient.signInIntent) }) {
                    Text("Sign in with Google")
                }
            }
        }
    }
}
```

- [ ] **Step 3: Build to verify compilation**

```bash
./gradlew :app:assembleDebug
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: Commit auth**

```bash
git add android/app/src/main/java/com/pomodoro/ui/auth/
git commit -m "feat: implement Google Sign-In with AuthViewModel and AuthScreen"
```

---

### Task 8: Implement TimerForegroundService

**Files:**
- Create: `android/app/src/main/java/com/pomodoro/service/TimerForegroundService.kt`

- [ ] **Step 1: Add notification permission and service to AndroidManifest.xml**

In `android/app/src/main/AndroidManifest.xml`, add inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

And inside `<application>`:

```xml
<service
    android:name=".service.TimerForegroundService"
    android:foregroundServiceType="specialUse"
    android:exported="false" />
```

- [ ] **Step 2: Write TimerForegroundService**

`TimerForegroundService.kt`:

```kotlin
package com.pomodoro.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Binder
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.pomodoro.data.model.TimerState
import com.pomodoro.data.model.TimerStatus
import com.pomodoro.domain.timer.TimerEngine
import com.pomodoro.ui.MainActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject

@AndroidEntryPoint
class TimerForegroundService : Service() {

    @Inject lateinit var timerEngine: TimerEngine

    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private var tickJob: Job? = null

    private val _remainingSeconds = MutableStateFlow(0L)
    val remainingSeconds: StateFlow<Long> = _remainingSeconds

    private var currentState: TimerState = TimerState()
    private var totalDuration: Long = 1500L

    inner class LocalBinder : Binder() {
        fun getService(): TimerForegroundService = this@TimerForegroundService
    }

    private val binder = LocalBinder()

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification("Ready"))
    }

    fun updateState(state: TimerState, totalDurationSeconds: Long) {
        currentState = state
        totalDuration = totalDurationSeconds
        tickJob?.cancel()
        if (state.status == TimerStatus.RUNNING) {
            tickJob = scope.launch {
                while (true) {
                    val remaining = timerEngine.remainingSeconds(currentState, totalDuration)
                    _remainingSeconds.value = remaining
                    updateNotification(formatTime(remaining))
                    if (remaining == 0L) break
                    delay(1_000)
                }
            }
        } else {
            _remainingSeconds.value = timerEngine.remainingSeconds(state, totalDurationSeconds)
            updateNotification(formatTime(_remainingSeconds.value))
        }
    }

    private fun formatTime(seconds: Long): String {
        val m = seconds / 60
        val s = seconds % 60
        return "%02d:%02d".format(m, s)
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID, "Timer", NotificationManager.IMPORTANCE_LOW
        ).apply { description = "Pomodoro timer countdown" }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun buildNotification(text: String): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pi = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Pomodoro Timer")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pi)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification(text: String) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIFICATION_ID, buildNotification(text))
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        const val CHANNEL_ID = "pomodoro_timer"
        const val NOTIFICATION_ID = 1001
    }
}
```

- [ ] **Step 3: Build to verify**

```bash
./gradlew :app:assembleDebug
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/java/com/pomodoro/service/ android/app/src/main/AndroidManifest.xml
git commit -m "feat: implement TimerForegroundService with persistent notification"
```

---

### Task 9: Implement TimerViewModel and TimerScreen

**Files:**
- Create: `android/app/src/main/java/com/pomodoro/ui/timer/TimerViewModel.kt`
- Create: `android/app/src/main/java/com/pomodoro/ui/timer/TimerScreen.kt`

- [ ] **Step 1: Write TimerViewModel**

`TimerViewModel.kt`:

```kotlin
package com.pomodoro.ui.timer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.pomodoro.data.model.*
import com.pomodoro.data.remote.FirestoreRepository
import com.pomodoro.domain.timer.TimerEngine
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.Instant
import java.util.UUID
import javax.inject.Inject
import javax.inject.Named

@HiltViewModel
class TimerViewModel @Inject constructor(
    private val firestoreRepo: FirestoreRepository,
    private val timerEngine: TimerEngine,
    private val auth: FirebaseAuth,
    @Named("deviceId") private val deviceId: String,
) : ViewModel() {

    private val _timerState = MutableStateFlow(TimerState())
    val timerState: StateFlow<TimerState> = _timerState

    private val _presets = MutableStateFlow<List<Preset>>(emptyList())
    val presets: StateFlow<List<Preset>> = _presets

    private val _selectedPreset = MutableStateFlow<Preset?>(null)
    val selectedPreset: StateFlow<Preset?> = _selectedPreset

    val remainingSeconds: StateFlow<Long> = combine(_timerState, _selectedPreset) { state, preset ->
        val duration = preset?.let { timerEngine.totalDurationForState(state, it) } ?: 1500L
        timerEngine.remainingSeconds(state, duration)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 1500L)

    init {
        viewModelScope.launch {
            firestoreRepo.observePresets().collect { presets ->
                _presets.value = presets
                if (_selectedPreset.value == null && presets.isNotEmpty()) {
                    _selectedPreset.value = presets.first()
                }
            }
        }
        viewModelScope.launch {
            firestoreRepo.observeTimerState().collect { state ->
                if (state != null) _timerState.value = state
            }
        }
    }

    fun selectPreset(preset: Preset) { _selectedPreset.value = preset }

    fun start() {
        val preset = _selectedPreset.value ?: return
        val current = _timerState.value
        val newState = current.copy(
            status = TimerStatus.RUNNING,
            presetId = preset.id,
            startedAt = Instant.now(),
            elapsed = 0,
            totalSessions = preset.sessionsBeforeLongBreak,
        )
        viewModelScope.launch { firestoreRepo.writeTimerState(newState, deviceId) }
    }

    fun pause() {
        val current = _timerState.value
        val preset = _selectedPreset.value ?: return
        val totalDuration = timerEngine.totalDurationForState(current, preset)
        val elapsed = totalDuration - timerEngine.remainingSeconds(current, totalDuration)
        val newState = current.copy(
            status = TimerStatus.PAUSED,
            pausedAt = Instant.now(),
            elapsed = elapsed,
        )
        viewModelScope.launch { firestoreRepo.writeTimerState(newState, deviceId) }
    }

    fun resume() {
        val current = _timerState.value
        val newState = current.copy(
            status = TimerStatus.RUNNING,
            startedAt = Instant.now(),
            pausedAt = null,
        )
        viewModelScope.launch { firestoreRepo.writeTimerState(newState, deviceId) }
    }

    fun stop() {
        val newState = _timerState.value.copy(
            status = TimerStatus.IDLE,
            elapsed = 0,
            startedAt = null,
            pausedAt = null,
        )
        viewModelScope.launch { firestoreRepo.writeTimerState(newState, deviceId) }
    }

    fun completeSession(tags: List<String> = emptyList(), projectName: String = "") {
        val current = _timerState.value
        val preset = _selectedPreset.value ?: return
        val session = Session(
            id = UUID.randomUUID().toString(),
            presetId = preset.id,
            tags = tags,
            projectName = projectName,
            startedAt = current.startedAt ?: Instant.now(),
            endedAt = Instant.now(),
            duration = preset.workDuration,
            type = SessionType.WORK,
            completed = true,
        )
        val nextSession = if (current.currentSession >= current.totalSessions) 1 else current.currentSession + 1
        val breakState = current.copy(
            status = TimerStatus.BREAK,
            isBreak = true,
            currentSession = nextSession,
            elapsed = 0,
            startedAt = Instant.now(),
        )
        viewModelScope.launch {
            firestoreRepo.writeSession(session)
            firestoreRepo.writeTimerState(breakState, deviceId)
        }
    }
}
```

- [ ] **Step 2: Write TimerScreen**

`TimerScreen.kt`:

```kotlin
package com.pomodoro.ui.timer

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.pomodoro.data.model.TimerStatus

@Composable
fun TimerScreen(viewModel: TimerViewModel = hiltViewModel()) {
    val timerState by viewModel.timerState.collectAsState()
    val remainingSeconds by viewModel.remainingSeconds.collectAsState()
    val presets by viewModel.presets.collectAsState()
    val selectedPreset by viewModel.selectedPreset.collectAsState()

    val minutes = remainingSeconds / 60
    val seconds = remainingSeconds % 60
    val timeText = "%02d:%02d".format(minutes, seconds)

    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        selectedPreset?.let { preset ->
            Text(preset.name, style = MaterialTheme.typography.titleMedium)
        }

        Spacer(Modifier.height(32.dp))

        Text(
            text = timeText,
            fontSize = 80.sp,
            fontWeight = FontWeight.Light,
            letterSpacing = 4.sp,
        )

        Spacer(Modifier.height(8.dp))

        Text(
            text = if (timerState.isBreak) "Break" else "Session ${timerState.currentSession} of ${timerState.totalSessions}",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(Modifier.height(48.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            when (timerState.status) {
                TimerStatus.IDLE -> {
                    Button(onClick = { viewModel.start() }) { Text("Start") }
                }
                TimerStatus.RUNNING, TimerStatus.BREAK -> {
                    OutlinedButton(onClick = { viewModel.stop() }) { Text("Stop") }
                    Button(onClick = { viewModel.pause() }) { Text("Pause") }
                }
                TimerStatus.PAUSED -> {
                    OutlinedButton(onClick = { viewModel.stop() }) { Text("Stop") }
                    Button(onClick = { viewModel.resume() }) { Text("Resume") }
                }
            }
        }

        Spacer(Modifier.height(32.dp))

        if (presets.isNotEmpty()) {
            Text("Preset", style = MaterialTheme.typography.labelMedium)
            Spacer(Modifier.height(8.dp))
            presets.forEach { preset ->
                FilterChip(
                    selected = selectedPreset?.id == preset.id,
                    onClick = { viewModel.selectPreset(preset) },
                    label = { Text(preset.name) },
                    modifier = Modifier.padding(vertical = 2.dp),
                )
            }
        }
    }
}
```

- [ ] **Step 3: Build**

```bash
./gradlew :app:assembleDebug
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/java/com/pomodoro/ui/timer/
git commit -m "feat: implement TimerViewModel and TimerScreen with Firestore sync"
```

---

### Task 10: Implement MainActivity with Navigation

**Files:**
- Create: `android/app/src/main/java/com/pomodoro/ui/MainActivity.kt`
- Create: `android/app/src/main/java/com/pomodoro/ui/theme/Theme.kt`
- Create: `android/app/src/main/java/com/pomodoro/ui/theme/Color.kt`

- [ ] **Step 1: Write theme files**

`Color.kt`:

```kotlin
package com.pomodoro.ui.theme

import androidx.compose.ui.graphics.Color

val Red600 = Color(0xFFE53935)
val Blue700 = Color(0xFF1E88E5)
val Green700 = Color(0xFF43A047)
val Gray100 = Color(0xFFF5F5F5)
val Gray800 = Color(0xFF424242)
```

`Theme.kt`:

```kotlin
package com.pomodoro.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary = Red600,
    onPrimary = androidx.compose.ui.graphics.Color.White,
    background = androidx.compose.ui.graphics.Color.White,
    surface = Gray100,
    onSurface = Gray800,
)

@Composable
fun PomodoroTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        typography = Typography(),
        content = content,
    )
}
```

- [ ] **Step 2: Write MainActivity**

`MainActivity.kt`:

```kotlin
package com.pomodoro.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.pomodoro.ui.auth.AuthScreen
import com.pomodoro.ui.history.HistoryScreen
import com.pomodoro.ui.stats.StatsScreen
import com.pomodoro.ui.theme.PomodoroTheme
import com.pomodoro.ui.timer.TimerScreen
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            PomodoroTheme {
                PomodoroApp()
            }
        }
    }
}

@Composable
fun PomodoroApp() {
    val navController = rememberNavController()
    var isAuthenticated by remember { mutableStateOf(false) }

    if (!isAuthenticated) {
        AuthScreen(onAuthenticated = { isAuthenticated = true })
        return
    }

    val tabs = listOf(
        Triple("timer", Icons.Default.Timer, "Timer"),
        Triple("history", Icons.Default.History, "History"),
        Triple("stats", Icons.Default.BarChart, "Stats"),
    )

    Scaffold(
        bottomBar = {
            NavigationBar {
                val currentRoute = navController.currentBackStackEntry?.destination?.route
                tabs.forEach { (route, icon, label) ->
                    NavigationBarItem(
                        selected = currentRoute == route,
                        onClick = { navController.navigate(route) { launchSingleTop = true } },
                        icon = { Icon(icon, contentDescription = label) },
                        label = { Text(label) },
                    )
                }
            }
        }
    ) { padding ->
        NavHost(navController, startDestination = "timer", Modifier.padding(padding)) {
            composable("timer") { TimerScreen() }
            composable("history") { HistoryScreen() }
            composable("stats") { StatsScreen() }
        }
    }
}
```

- [ ] **Step 3: Add stub screens for History and Stats**

`HistoryScreen.kt`:

```kotlin
package com.pomodoro.ui.history

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier

@Composable
fun HistoryScreen() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text("History — coming soon", style = MaterialTheme.typography.bodyLarge)
    }
}
```

`StatsScreen.kt`:

```kotlin
package com.pomodoro.ui.stats

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier

@Composable
fun StatsScreen() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text("Stats — coming soon", style = MaterialTheme.typography.bodyLarge)
    }
}
```

- [ ] **Step 4: Build and run on emulator**

```bash
./gradlew :app:assembleDebug
```

Then install on a running Android emulator:

```bash
./gradlew :app:installDebug
```

Expected: App launches, shows sign-in screen, after sign-in shows timer with bottom nav.

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/pomodoro/ui/
git commit -m "feat: wire up MainActivity with bottom nav, auth gate, and all screens"
```

---

### Task 11: Implement History Screen

**Files:**
- Modify: `android/app/src/main/java/com/pomodoro/ui/history/HistoryScreen.kt`
- Create: `android/app/src/main/java/com/pomodoro/ui/history/HistoryViewModel.kt`

- [ ] **Step 1: Write HistoryViewModel**

`HistoryViewModel.kt`:

```kotlin
package com.pomodoro.ui.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pomodoro.data.model.Session
import com.pomodoro.data.remote.FirestoreRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.temporal.ChronoUnit
import javax.inject.Inject

@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val firestoreRepo: FirestoreRepository,
) : ViewModel() {

    private val _sessions = MutableStateFlow<List<Session>>(emptyList())
    val sessions: StateFlow<List<Session>> = _sessions

    init {
        viewModelScope.launch {
            // Load last 30 days from Firestore
            // In production, paginate — for v1, load recent 100 sessions
            firestoreRepo.observeRecentSessions(limit = 100).collect { sessions ->
                _sessions.value = sessions
            }
        }
    }
}
```

Add `observeRecentSessions` to `FirestoreRepository.kt`:

```kotlin
fun observeRecentSessions(limit: Long = 100): Flow<List<Session>> = callbackFlow {
    val listener = userRef().collection("sessions")
        .orderBy("startedAt", com.google.firebase.firestore.Query.Direction.DESCENDING)
        .limit(limit)
        .addSnapshotListener { snapshot, error ->
            if (error != null) { close(error); return@addSnapshotListener }
            val sessions = snapshot?.documents?.map { doc ->
                Session(
                    id = doc.id,
                    presetId = doc.getString("presetId") ?: "",
                    tags = (doc.get("tags") as? List<*>)?.filterIsInstance<String>() ?: emptyList(),
                    projectName = doc.getString("projectName") ?: "",
                    startedAt = doc.getTimestamp("startedAt")?.let { Instant.ofEpochSecond(it.seconds) } ?: Instant.EPOCH,
                    endedAt = doc.getTimestamp("endedAt")?.let { Instant.ofEpochSecond(it.seconds) } ?: Instant.EPOCH,
                    duration = (doc.getLong("duration") ?: 0L).toInt(),
                    type = SessionType.valueOf(doc.getString("type") ?: "WORK"),
                    completed = doc.getBoolean("completed") ?: false,
                )
            } ?: emptyList()
            trySend(sessions)
        }
    awaitClose { listener.remove() }
}
```

- [ ] **Step 2: Write HistoryScreen**

Replace `HistoryScreen.kt`:

```kotlin
package com.pomodoro.ui.history

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Composable
fun HistoryScreen(viewModel: HistoryViewModel = hiltViewModel()) {
    val sessions by viewModel.sessions.collectAsState()
    val formatter = DateTimeFormatter.ofPattern("MMM d, HH:mm").withZone(ZoneId.systemDefault())

    if (sessions.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
            Text("No sessions yet. Start your first Pomodoro!")
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(sessions) { session ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text(
                        text = "${session.type.name.replace("_", " ")} — ${session.duration} min",
                        style = MaterialTheme.typography.titleSmall,
                    )
                    Text(
                        text = formatter.format(session.startedAt),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    if (session.projectName.isNotBlank()) {
                        Text("Project: ${session.projectName}", style = MaterialTheme.typography.bodySmall)
                    }
                    if (session.tags.isNotEmpty()) {
                        Text("Tags: ${session.tags.joinToString()}", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}
```

- [ ] **Step 3: Build**

```bash
./gradlew :app:assembleDebug
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/java/com/pomodoro/ui/history/ android/app/src/main/java/com/pomodoro/data/remote/FirestoreRepository.kt
git commit -m "feat: implement History screen showing recent sessions"
```

---

### Task 12: Implement Stats Screen with Export

**Files:**
- Modify: `android/app/src/main/java/com/pomodoro/ui/stats/StatsScreen.kt`
- Create: `android/app/src/main/java/com/pomodoro/ui/stats/StatsViewModel.kt`

- [ ] **Step 1: Write StatsViewModel**

`StatsViewModel.kt`:

```kotlin
package com.pomodoro.ui.stats

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pomodoro.data.model.Session
import com.pomodoro.data.model.SessionType
import com.pomodoro.data.remote.FirestoreRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit
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
            firestoreRepo.observeRecentSessions(limit = 500).collect { sessions ->
                _state.value = computeStats(sessions)
            }
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

        // Build daily stats for last 7 days
        val dailyStats = (0..6).map { daysAgo ->
            val date = today.minusDays(daysAgo.toLong())
            val daySessions = workSessions.filter {
                it.startedAt.atZone(zone).toLocalDate() == date
            }
            DailyStats(date, daySessions.size, daySessions.sumOf { it.duration })
        }.reversed()

        // Streak: consecutive days with at least 1 work session
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
```

- [ ] **Step 2: Write StatsScreen**

Replace `StatsScreen.kt`:

```kotlin
package com.pomodoro.ui.stats

import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.hilt.navigation.compose.hiltViewModel
import java.io.File

@Composable
fun StatsScreen(viewModel: StatsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Statistics", style = MaterialTheme.typography.headlineSmall)

        // Today
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text("Today", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                Text("${state.todaySessions} sessions · ${state.todayMinutes} minutes")
                Text("Streak: ${state.streakDays} day${if (state.streakDays != 1) "s" else ""}")
            }
        }

        // This week
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text("This Week", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                Text("${state.weekSessions} sessions · ${state.weekMinutes} minutes")
            }
        }

        // Daily breakdown
        if (state.dailyStats.isNotEmpty()) {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text("Last 7 Days", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(8.dp))
                    state.dailyStats.forEach { day ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(day.date.toString())
                            Text("${day.sessions} sessions, ${day.minutes} min")
                        }
                    }
                }
            }
        }

        // By tag
        if (state.byTag.isNotEmpty()) {
            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text("By Tag (minutes)", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(8.dp))
                    state.byTag.entries.sortedByDescending { it.value }.forEach { (tag, minutes) ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(tag)
                            Text("$minutes min")
                        }
                    }
                }
            }
        }

        // Export
        Button(
            onClick = {
                val csv = viewModel.exportToCsv()
                val file = File(context.cacheDir, "pomodoro_sessions.csv")
                file.writeText(csv)
                val uri = FileProvider.getUriForFile(context, "${context.packageName}.provider", file)
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/csv"
                    putExtra(Intent.EXTRA_STREAM, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                context.startActivity(Intent.createChooser(intent, "Export sessions"))
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Export Sessions (CSV)")
        }
    }
}
```

- [ ] **Step 3: Add FileProvider to AndroidManifest.xml**

Inside `<application>` in `AndroidManifest.xml`:

```xml
<provider
    android:name="androidx.core.content.FileProvider"
    android:authorities="${applicationId}.provider"
    android:exported="false"
    android:grantUriPermissions="true">
    <meta-data
        android:name="android.support.FILE_PROVIDER_PATHS"
        android:resource="@xml/file_paths" />
</provider>
```

Create `android/app/src/main/res/xml/file_paths.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<paths>
    <cache-path name="cache" path="." />
</paths>
```

- [ ] **Step 4: Build**

```bash
./gradlew :app:assembleDebug
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/pomodoro/ui/stats/ android/app/src/main/AndroidManifest.xml android/app/src/main/res/xml/
git commit -m "feat: implement Stats screen with daily/weekly breakdown and CSV export"
```

---

### Task 13: End-to-End Test on Device

- [ ] **Step 1: Start Firebase emulator**

```bash
cd D:/Data/20260409-pomodoro-timer/firebase
firebase emulators:start
```

- [ ] **Step 2: Seed test data**

```bash
node seed/seed-emulator.js
```

- [ ] **Step 3: Install and run the debug build on Android emulator**

```bash
cd D:/Data/20260409-pomodoro-timer/android
./gradlew :app:installDebug
```

Launch the app. The debug build connects to the emulator (`10.0.2.2:8080`).

- [ ] **Step 4: Manual smoke test checklist**

- [ ] Sign in with Google (or test account on emulator)
- [ ] Timer screen shows "Standard" preset with 25:00
- [ ] Press Start — timer counts down, bottom notification appears
- [ ] Press Pause — timer freezes
- [ ] Press Resume — timer continues
- [ ] Press Stop — timer resets
- [ ] Switch to Deep Work preset — timer shows 50:00
- [ ] Start timer, background the app — notification still shows countdown
- [ ] History tab shows no sessions (fresh)
- [ ] Stats tab shows 0 sessions today

- [ ] **Step 5: Test sync (optional — requires two devices)**

Run the same debug APK on a second device/emulator connected to the same Firebase emulator. Start a timer on one — verify it appears on the other within ~2 seconds.

- [ ] **Step 6: Commit final**

```bash
git add .
git commit -m "feat: complete Android Pomodoro app v1.0"
```

---

**Android app is complete.** The Electron app can be built in parallel — see `docs/superpowers/plans/2026-04-09-electron-app.md`.
