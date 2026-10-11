package io.github.hannescoetzee.wazuhagent.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import io.github.hannescoetzee.wazuhagent.R
import io.github.hannescoetzee.wazuhagent.ui.MainActivity

object Notifications {
    const val CHANNEL_AGENT = "agent"
    const val ID_AGENT = 1

    fun createChannels(context: Context) {
        val channel = NotificationChannel(CHANNEL_AGENT, "Agent status", NotificationManager.IMPORTANCE_LOW).apply {
            description = "Persistent notification while the Wazuh agent is running"
            setShowBadge(false)
        }
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    fun agent(context: Context, status: AgentStatus, wakeLockHeld: Boolean = false): android.app.Notification {
        val open = PendingIntent.getActivity(
            context, 0, Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val stop = PendingIntent.getService(
            context, 1, AgentForegroundService.stopIntent(context),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val text = when (status.state) {
            ConnectionState.CONNECTED -> "Connected"
            ConnectionState.CONNECTING -> "Connecting…"
            ConnectionState.WAITING_RETRY -> "Offline, retrying"
            ConnectionState.STOPPED -> "Stopped"
        }
        val detail = if (status.detail.isEmpty()) text else "$text · ${status.detail}"
        val content = if (wakeLockHeld) "$detail · wake lock held" else detail
        val builder = NotificationCompat.Builder(context, CHANNEL_AGENT)
            .setSmallIcon(R.drawable.ic_stat_agent)
            .setContentTitle("Wazuh agent")
            .setContentText(content)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(open)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        if (!ignoringBatteryOptimizations(context)) {
            builder.addAction(0, "Unrestrict", unrestrictPendingIntent(context))
        }
        builder.addAction(0, "Stop", stop)
        return builder.build()
    }

    private fun ignoringBatteryOptimizations(context: Context): Boolean =
        context.getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(context.packageName)

    /** Opens the app, which asks for the exemption. Settings is not launched from the service. */
    private fun unrestrictPendingIntent(context: Context): PendingIntent {
        val open = Intent(context, MainActivity::class.java)
            .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .putExtra(MainActivity.EXTRA_REQUEST_BATTERY, true)
        return PendingIntent.getActivity(
            context, 3, open,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
    }
}
