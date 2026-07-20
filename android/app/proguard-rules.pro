# ProGuard configuration for BaitBuddy (Capacitor WebView app)

# Preserve line numbers for debugging
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep Capacitor classes
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
  public <init>(com.getcapacitor.CapacitorPlugin);
}

# Keep JavaScript bridge interface
-keepclassmembers class * {
  *** on*(android.webkit.WebView, ...);
}

# Keep annotation classes
-keepattributes *Annotation*
-keep interface * { *; }

# Keep enum classes
-keepclassmembers enum * {
  public static **[] values();
  public static ** valueOf(java.lang.String);
}

# Preserve native method names (needed by WebView)
-keepclasseswithmembernames class * {
  native <methods>;
}

# Keep inner classes (required for callbacks and listeners)
-keepclassmembers class * {
  void *(android.view.View);
}

# Preserve classes that might be instantiated via reflection
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.content.ContentProvider

# Google Play Billing
-keep class com.android.billingclient.** { *; }
-keep class com.android.vending.billing.** { *; }

# Keep AndroidBilling JavaScript interface
-keepclassmembers class com.base68bb3d3b9f83dc1f55ef532b.app.AndroidBillingBridge {
  @android.webkit.JavascriptInterface <methods>;
}

# Optimization settings
-optimizationpasses 5
-allowaccessmodification
