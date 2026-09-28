package com.cngcompliancemobilev2

import android.app.Activity
import android.content.Intent
import android.provider.MediaStore
import com.facebook.react.bridge.*

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
            val intent = Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
            intent.type = "image/*"
            activity.startActivityForResult(intent, 8888)
        } catch (e: Exception) {
            pickerPromise?.reject("E_FAILED_TO_SHOW_PICKER", e)
            pickerPromise = null
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == 8888) {
            if (resultCode == Activity.RESULT_OK && data?.data != null) {
                pickerPromise?.resolve(data.data.toString())
            } else {
                pickerPromise?.resolve(null)
            }
            pickerPromise = null
        }
    }

    override fun onNewIntent(intent: Intent) {}
}
