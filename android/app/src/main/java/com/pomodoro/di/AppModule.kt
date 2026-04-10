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
