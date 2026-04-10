package com.pomodoro.ui.auth

import android.app.Activity
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.pomodoro.R

@Composable
fun AuthScreen(viewModel: AuthViewModel) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    val gso = remember {
        GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(context.getString(R.string.default_web_client_id))
            .requestEmail()
            .build()
    }
    val googleSignInClient = remember { GoogleSignIn.getClient(context, gso) }

    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        Log.d("AuthScreen", "Sign-in result code: ${result.resultCode}")
        if (result.resultCode == Activity.RESULT_OK) {
            try {
                val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
                val account = task.getResult(ApiException::class.java)
                Log.d("AuthScreen", "Got account: ${account.email}, idToken null: ${account.idToken == null}")
                viewModel.signInWithGoogle(account)
            } catch (e: ApiException) {
                Log.e("AuthScreen", "Google sign-in ApiException: statusCode=${e.statusCode} msg=${e.message}")
                viewModel.setError("Sign-in failed (code ${e.statusCode})")
            }
        } else {
            Log.e("AuthScreen", "Sign-in not OK, resultCode=${result.resultCode}")
            viewModel.setError("Sign-in cancelled or failed (resultCode ${result.resultCode})")
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
                Text(
                    text = (state as AuthState.Error).message,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                )
                Spacer(Modifier.height(16.dp))
                Button(onClick = { launcher.launch(googleSignInClient.signInIntent) }) {
                    Text("Try Again")
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
