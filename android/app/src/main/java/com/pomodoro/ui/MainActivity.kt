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
