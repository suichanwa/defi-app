package com.yourcompany.defiaiapp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SecureChatNotificationsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val CHANNEL_ID = "secure_chat_messages"
    private const val CHANNEL_NAME = "Secure chat messages"
    private const val CHANNEL_DESCRIPTION = "Notifications for incoming secure chat messages"
  }

  override fun getName(): String = "SecureChatNotifications"

  @ReactMethod
  fun ensureChannel(promise: Promise) {
    try {
      createChannel()
      promise.resolve(null)
    } catch (error: Throwable) {
      promise.reject("SECURE_CHAT_CHANNEL_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun notifyChatMessage(
    chatId: String,
    chatName: String,
    author: String,
    message: String,
    messageType: String?,
    promise: Promise,
  ) {
    try {
      createChannel()
      val context = reactApplicationContext
      val manager = NotificationManagerCompat.from(context)
      if (!manager.areNotificationsEnabled()) {
        promise.resolve(false)
        return
      }

      val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      if (launchIntent == null) {
        promise.resolve(false)
        return
      }

      launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      launchIntent.putExtra("secure_chat_notification_chat_id", chatId)
      launchIntent.putExtra("secure_chat_notification_chat_name", chatName)
      launchIntent.putExtra("secure_chat_notification_author", author)
      launchIntent.putExtra("secure_chat_notification_message_type", messageType)

      val pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT or
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0

      val pendingIntent = PendingIntent.getActivity(
        context,
        chatId.hashCode(),
        launchIntent,
        pendingIntentFlags,
      )

      val preview = buildPreview(message, messageType)
      val title = author.trim().ifEmpty { chatName.trim().ifEmpty { "New message" } }
      val subtitle = if (chatName.isNotBlank() && chatName != title) chatName else null

      val builder = NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(R.mipmap.ic_launcher_round)
        .setContentTitle(title)
        .setContentText(preview)
        .setStyle(NotificationCompat.BigTextStyle().bigText(preview))
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setCategory(NotificationCompat.CATEGORY_MESSAGE)
        .setAutoCancel(true)
        .setOnlyAlertOnce(false)
        .setContentIntent(pendingIntent)
        .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)

      if (!subtitle.isNullOrBlank()) {
        builder.setSubText(subtitle)
      }

      val notificationId = "${chatId}:${author}:${message.hashCode()}".hashCode()
      manager.notify(notificationId, builder.build())
      promise.resolve(true)
    } catch (error: Throwable) {
      promise.reject("SECURE_CHAT_NOTIFY_FAILED", error.message, error)
    }
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val context = reactApplicationContext
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channel = NotificationChannel(
      CHANNEL_ID,
      CHANNEL_NAME,
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = CHANNEL_DESCRIPTION
      enableLights(true)
      lightColor = Color.MAGENTA
      enableVibration(true)
      lockscreenVisibility = NotificationCompat.VISIBILITY_PRIVATE
    }
    manager.createNotificationChannel(channel)
  }

  private fun buildPreview(message: String, messageType: String?): String {
    val trimmed = message.trim()
    if (trimmed.isNotEmpty()) {
      return trimmed.take(140)
    }
    return when (messageType) {
      "image" -> "Photo"
      "file" -> "File attachment"
      "system" -> "System message"
      else -> "New message"
    }
  }
}
