# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# WalletConnect pulls in JNA, which references desktop-only AWT types that are not used on Android.
-dontwarn java.awt.Component

# XMTP SDK relies on Kotlin/Uniffi classes and native bindings that can break if obfuscated.
-keep class expo.modules.xmtpreactnativesdk.** { *; }
-keep class org.xmtp.** { *; }
-keep class uniffi.xmtpv3.** { *; }
-dontwarn org.xmtp.**
-dontwarn uniffi.xmtpv3.**

# Add any project specific keep options here:
