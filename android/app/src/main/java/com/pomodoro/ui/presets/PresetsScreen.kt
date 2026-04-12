package com.pomodoro.ui.presets

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.pomodoro.data.model.Preset

@Composable
fun PresetsScreen(viewModel: PresetsViewModel = hiltViewModel()) {
    val presets by viewModel.presets.collectAsState()
    val error by viewModel.error.collectAsState()

    var showDialog by remember { mutableStateOf(false) }
    var editingPreset by remember { mutableStateOf<Preset?>(null) }
    var deleteTarget by remember { mutableStateOf<Preset?>(null) }

    Scaffold(
        topBar = {
            @OptIn(ExperimentalMaterial3Api::class)
            TopAppBar(title = { Text("Presets") })
        },
        floatingActionButton = {
            FloatingActionButton(onClick = {
                editingPreset = null
                showDialog = true
            }) {
                Icon(Icons.Default.Add, contentDescription = "Add preset")
            }
        },
        snackbarHost = {
            if (error != null) {
                LaunchedEffect(error) {
                    viewModel.clearError()
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(vertical = 12.dp),
        ) {
            items(presets, key = { it.id }) { preset ->
                PresetCard(
                    preset = preset,
                    onEdit = {
                        editingPreset = preset
                        showDialog = true
                    },
                    onDelete = { deleteTarget = preset },
                )
            }
        }
    }

    if (showDialog) {
        PresetDialog(
            preset = editingPreset,
            onDismiss = { showDialog = false },
            onSave = { name, work, shortBreak, longBreak, sessions ->
                viewModel.savePreset(
                    id = editingPreset?.id,
                    name = name,
                    workDuration = work,
                    shortBreakDuration = shortBreak,
                    longBreakDuration = longBreak,
                    sessionsBeforeLongBreak = sessions,
                )
                showDialog = false
            },
        )
    }

    deleteTarget?.let { preset ->
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text("Delete "${preset.name}"?") },
            text = { Text("This cannot be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deletePreset(preset.id)
                    deleteTarget = null
                }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { deleteTarget = null }) { Text("Cancel") }
            },
        )
    }
}

@Composable
private fun PresetCard(
    preset: Preset,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    val accentColor = runCatching {
        Color(android.graphics.Color.parseColor(preset.color))
    }.getOrElse { MaterialTheme.colorScheme.primary }

    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .background(accentColor, shape = MaterialTheme.shapes.small),
            )
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = preset.name,
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    text = "Work ${preset.workDuration}m · Short break ${preset.shortBreakDuration}m · Long break ${preset.longBreakDuration}m · ${preset.sessionsBeforeLongBreak} sessions",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (!preset.builtIn) {
                IconButton(onClick = onEdit) {
                    Icon(Icons.Default.Edit, contentDescription = "Edit")
                }
                IconButton(onClick = onDelete) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Delete",
                        tint = MaterialTheme.colorScheme.error,
                    )
                }
            }
        }
    }
}

@Composable
private fun PresetDialog(
    preset: Preset?,
    onDismiss: () -> Unit,
    onSave: (name: String, work: Int, shortBreak: Int, longBreak: Int, sessions: Int) -> Unit,
) {
    var name by remember { mutableStateOf(preset?.name ?: "") }
    var work by remember { mutableStateOf((preset?.workDuration ?: 25).toString()) }
    var shortBreak by remember { mutableStateOf((preset?.shortBreakDuration ?: 5).toString()) }
    var longBreak by remember { mutableStateOf((preset?.longBreakDuration ?: 15).toString()) }
    var sessions by remember { mutableStateOf((preset?.sessionsBeforeLongBreak ?: 4).toString()) }

    fun Int?.isValidDuration() = this != null && this in 1..120
    fun Int?.isValidSessions() = this != null && this in 1..10

    val workInt = work.toIntOrNull()
    val shortBreakInt = shortBreak.toIntOrNull()
    val longBreakInt = longBreak.toIntOrNull()
    val sessionsInt = sessions.toIntOrNull()

    val isValid = name.isNotBlank()
            && workInt.isValidDuration()
            && shortBreakInt.isValidDuration()
            && longBreakInt.isValidDuration()
            && sessionsInt.isValidSessions()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (preset == null) "New preset" else "Edit preset") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                DurationField("Work (min, 1–120)", work) { work = it }
                DurationField("Short break (min, 1–120)", shortBreak) { shortBreak = it }
                DurationField("Long break (min, 1–120)", longBreak) { longBreak = it }
                DurationField("Sessions before long break (1–10)", sessions) { sessions = it }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    onSave(name, workInt!!, shortBreakInt!!, longBreakInt!!, sessionsInt!!)
                },
                enabled = isValid,
            ) { Text("Save") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        },
    )
}

@Composable
private fun DurationField(label: String, value: String, onValueChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = { onValueChange(it.filter { c -> c.isDigit() }.take(3)) },
        label = { Text(label) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        modifier = Modifier.fillMaxWidth(),
    )
}
