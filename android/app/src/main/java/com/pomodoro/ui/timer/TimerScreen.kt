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
