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
