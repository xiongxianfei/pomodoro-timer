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
