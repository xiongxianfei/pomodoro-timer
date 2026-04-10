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

        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text("Today", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                Text("${state.todaySessions} sessions · ${state.todayMinutes} minutes")
                Text("Streak: ${state.streakDays} day${if (state.streakDays != 1) "s" else ""}")
            }
        }

        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text("This Week", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                Text("${state.weekSessions} sessions · ${state.weekMinutes} minutes")
            }
        }

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
