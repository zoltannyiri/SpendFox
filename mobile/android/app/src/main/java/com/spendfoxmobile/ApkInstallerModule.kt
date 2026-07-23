package com.spendfoxmobile

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ApkInstallerModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ApkInstaller"

  @ReactMethod
  fun downloadAndInstallApk(url: String, fileName: String, promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !reactContext.packageManager.canRequestPackageInstalls()) {
        val intent = Intent(
          Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
          Uri.parse("package:${reactContext.packageName}")
        ).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        reactContext.startActivity(intent)
        promise.reject(
          "INSTALL_PERMISSION_REQUIRED",
          "Engedelyezd az ismeretlen appok telepiteset, majd inditsd ujra a frissitest."
        )
        return
      }

      val downloadManager = reactContext.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
      val request = DownloadManager.Request(Uri.parse(url))
        .setTitle("SpendFox frissites")
        .setDescription("Az uj SpendFox APK letoltese folyamatban van.")
        .setMimeType(APK_MIME_TYPE)
        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        .setDestinationInExternalFilesDir(
          reactContext,
          Environment.DIRECTORY_DOWNLOADS,
          fileName.ifBlank { DEFAULT_FILE_NAME }
        )

      val downloadId = downloadManager.enqueue(request)

      val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
          val finishedId = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1)

          if (finishedId != downloadId) {
            return
          }

          try {
            reactContext.unregisterReceiver(this)
          } catch (_: IllegalArgumentException) {
          }

          val query = DownloadManager.Query().setFilterById(downloadId)
          val cursor = downloadManager.query(query)

          cursor.use {
            if (!it.moveToFirst()) {
              promise.reject("DOWNLOAD_NOT_FOUND", "Nem talalhato a letoltott APK.")
              return
            }

            val statusIndex = it.getColumnIndex(DownloadManager.COLUMN_STATUS)
            val status = it.getInt(statusIndex)

            if (status != DownloadManager.STATUS_SUCCESSFUL) {
              promise.reject("DOWNLOAD_FAILED", "Nem sikerult letolteni az APK-t.")
              return
            }
          }

          val apkUri = downloadManager.getUriForDownloadedFile(downloadId)

          if (apkUri == null) {
            promise.reject("APK_URI_EMPTY", "Nem sikerult megnyitni a letoltott APK-t.")
            return
          }

          val installIntent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(apkUri, APK_MIME_TYPE)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          }

          reactContext.startActivity(installIntent)
          promise.resolve(true)
        }
      }

      val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        reactContext.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        reactContext.registerReceiver(receiver, filter)
      }
    } catch (err: Exception) {
      promise.reject("APK_INSTALLER_ERROR", err.message, err)
    }
  }

  companion object {
    private const val APK_MIME_TYPE = "application/vnd.android.package-archive"
    private const val DEFAULT_FILE_NAME = "spendfox-update.apk"
  }
}
