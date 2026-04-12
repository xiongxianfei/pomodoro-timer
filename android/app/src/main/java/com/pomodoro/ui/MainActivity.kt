package com.pomodoro.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navOptions
import com.pomodoro.ui.auth.AuthScreen
import com.pomodoro.ui.auth.AuthState
import com.pomodoro.ui.auth.AuthViewModel
import com.pomodoro.ui.history.HistoryScreen
import com.pomodoro.ui.presets.PresetsScreen
import com.pomodoro.ui.profile.ProfileScreen
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

private data class NavTab(
    val route: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val label: String,
)

@Composable
fun PomodoroApp() {
    val authViewModel: AuthViewModel = hiltViewModel()
    val authState by authViewModel.state.collectAsState()

    when (authState) {
        is AuthState.Loading -> {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        is AuthState.Authenticated -> {
            MainContent()
        }
        else -> {
            AuthScreen(viewModel = authViewModel)
        }
    }
}

@Composable
private fun MainContent() {
    val navController = rememberNavController()
    val tabs = listOf(
        NavTab("timer", Icons.Default.Timer, "Timer"),
        NavTab("history", Icons.Default.History, "History"),
        NavTab("stats", Icons.Default.BarChart, "Stats"),
        NavTab("presets", Icons.Default.Tune, "Presets"),
        NavTab("profile", Icons.Default.Person, "Profile"),
    )
    val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route

    Scaffold(
        bottomBar = {
            NavigationBar {
                tabs.forEach { tab ->
                    NavigationBarItem(
                        selected = currentRoute == tab.route,
                        onClick = {
                            navController.navigate(tab.route, navOptions {
                                popUpTo(navController.graph.startDestinationId) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            })
                        },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label) },
                    )
                }
            }
        }
    ) { padding ->
        NavHost(navController, startDestination = "timer", Modifier.padding(padding)) {
            composable("timer") { TimerScreen() }
            composable("history") { HistoryScreen() }
            composable("stats") { StatsScreen() }
            composable("presets") { PresetsScreen() }
            composable("profile") { ProfileScreen() }
        }
    }
}
