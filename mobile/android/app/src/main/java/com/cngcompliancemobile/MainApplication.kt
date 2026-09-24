package com.cngcompliancemobile

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.JavaScriptExecutorFactory
import com.facebook.hermes.reactexecutor.HermesExecutorFactory
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import com.facebook.soloader.ExternalSoMapping
import com.facebook.soloader.nativeloader.NativeLoader
import com.facebook.soloader.nativeloader.NativeLoaderDelegate
import com.facebook.soloader.nativeloader.SystemDelegate
import com.facebook.react.soloader.OpenSourceMergedSoMapping

class SafeNativeLoaderDelegate(private val delegate: NativeLoaderDelegate = SystemDelegate()) : NativeLoaderDelegate {
    private val optionalLibraries = setOf("react_devsupportjni", "react_featureflagsjni")

    override fun loadLibrary(shortName: String, flags: Int): Boolean {
        return try {
            delegate.loadLibrary(shortName, flags)
        } catch (e: UnsatisfiedLinkError) {
            if (optionalLibraries.contains(shortName)) {
                android.util.Log.w("SafeNativeLoader", "Ignoring optional native library load failure for $shortName: ${e.message}")
                false
            } else {
                throw e
            }
        }
    }

    override fun getLibraryPath(shortName: String): String? = delegate.getLibraryPath(shortName)
    override fun getSoSourcesVersion(): Int = delegate.getSoSourcesVersion()
}

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED

        override fun getJavaScriptExecutorFactory(): JavaScriptExecutorFactory = HermesExecutorFactory()
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    try {
      if (!NativeLoader.isInitialized()) {
        NativeLoader.init(SafeNativeLoaderDelegate())
      }
    } catch (e: Throwable) {
      e.printStackTrace()
    }
    try {
      val localAccessorClass = Class.forName("com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsLocalAccessor")
      val localAccessor = localAccessorClass.getDeclaredConstructor().newInstance()
      val flagsClass = Class.forName("com.facebook.react.internal.featureflags.ReactNativeFeatureFlags")
      val accessorField = flagsClass.getDeclaredField("accessor")
      accessorField.isAccessible = true
      accessorField.set(flagsClass.getField("INSTANCE").get(null), localAccessor)
    } catch (e: Throwable) {
      e.printStackTrace()
    }
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      load()
    }
  }
}
