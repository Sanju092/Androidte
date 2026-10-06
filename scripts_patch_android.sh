#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-.}"
ANDROID="$ROOT/android"
PKG="$ANDROID/app/src/main/java/com/hydmetro/tracker"
mkdir -p "$PKG"
cp "$ROOT/native-android/com/hydmetro/tracker/MetroOverlayPlugin.java" "$PKG/"
cp "$ROOT/native-android/com/hydmetro/tracker/MetroTrackerService.java" "$PKG/"
cat > "$PKG/MainActivity.java" <<'JAVA'
package com.hydmetro.tracker;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MetroOverlayPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
JAVA
python3 - <<'PY'
from pathlib import Path
p=Path('android/app/src/main/AndroidManifest.xml')
s=p.read_text()
marker='<manifest xmlns:android="http://schemas.android.com/apk/res/android">'
perms='''\n    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />\n    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />\n    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />\n    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />\n    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />\n    <uses-permission android:name="android.permission.VIBRATE" />\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n'''
import re
if 'android.permission.SYSTEM_ALERT_WINDOW' not in s:
    s,n=re.subn(r'(<manifest[^>]*>)',lambda m:m.group(1)+perms,s,count=1)
    assert n==1,'manifest tag not found'
app='''\n        <service android:name="com.hydmetro.tracker.MetroTrackerService" android:exported="false" android:foregroundServiceType="location" android:stopWithTask="false" />\n'''
if 'MetroTrackerService' not in s:
    s=s.replace('</application>',app+'    </application>')
p.write_text(s)
PY
