package com.cngcompliancemobilev2

import android.app.Activity
import android.content.Intent
import android.provider.MediaStore
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream

class GalleryPickerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private var pickerPromise: Promise? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = "GalleryPicker"

    @ReactMethod
    fun openGallery(promise: Promise) {
        val activity = reactContext.currentActivity
        if (activity == null) {
            promise.reject("E_ACTIVITY_DOES_NOT_EXIST", "Activity does not exist")
            return
        }
        pickerPromise = promise
        try {
            val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                type = "image/*"
                addCategory(Intent.CATEGORY_OPENABLE)
            }
            activity.startActivityForResult(Intent.createChooser(intent, "Select Vehicle Image"), 8888)
        } catch (e: Exception) {
            pickerPromise?.reject("E_FAILED_TO_SHOW_PICKER", e)
            pickerPromise = null
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == 8888) {
            if (resultCode == Activity.RESULT_OK && data?.data != null) {
                try {
                    val contentUri = data.data!!
                    val inputStream: InputStream? = reactContext.contentResolver.openInputStream(contentUri)
                    if (inputStream == null) {
                        pickerPromise?.reject("E_CANNOT_OPEN_STREAM", "Could not open stream for selected image")
                    } else {
                        val cacheFile = File(reactContext.cacheDir, "gallery_picker_${System.currentTimeMillis()}.jpg")
                        FileOutputStream(cacheFile).use { output ->
                            inputStream.copyTo(output)
                        }
                        inputStream.close()
                        pickerPromise?.resolve("file://" + cacheFile.absolutePath)
                    }
                } catch (e: Exception) {
                    pickerPromise?.reject("E_COPY_FAILED", "Failed to process gallery image: ${e.message}")
                }
            } else {
                pickerPromise?.resolve(null)
            }
            pickerPromise = null
        }
    }

    override fun onNewIntent(intent: Intent) {}
}
