package com.hydmetro.tracker;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(name = "MetroOverlay", permissions = {
    @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION })
})
public class MetroOverlayPlugin extends Plugin {
    private boolean locationOk() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void resolveStatus(PluginCall call) {
        JSObject r = new JSObject();
        r.put("location", locationOk());
        r.put("overlay", Settings.canDrawOverlays(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void status(PluginCall call) { resolveStatus(call); }

    @PluginMethod
    public void requestLocation(PluginCall call) {
        if (locationOk()) { resolveStatus(call); return; }
        requestPermissionForAlias("location", call, "locationDone");
    }

    @PermissionCallback
    private void locationDone(PluginCall call) { resolveStatus(call); }

    @PluginMethod
    public void requestOverlay(PluginCall call) {
        if (!Settings.canDrawOverlays(getContext())) {
            Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        }
        resolveStatus(call);
    }

    // Starts the overlay service only when both permissions exist (never opens Settings by itself).
    @PluginMethod
    public void start(PluginCall call) {
        getContext().getSharedPreferences(MetroTrackerService.PREFS, 0).edit()
            .putString(MetroTrackerService.JOURNEY_KEY, call.getString("journeyJson", "{}")).apply();
        boolean ok = locationOk() && Settings.canDrawOverlays(getContext());
        if (ok) {
            getContext().startForegroundService(new Intent(getContext(), MetroTrackerService.class).setAction(MetroTrackerService.ACTION_START));
        }
        JSObject r = new JSObject();
        r.put("started", ok);
        call.resolve(r);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), MetroTrackerService.class));
        call.resolve();
    }
}
