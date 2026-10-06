package com.hydmetro.tracker;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.location.*;
import android.os.*;
import android.provider.Settings;
import android.view.*;
import android.widget.*;
import org.json.*;
import java.util.*;

public class MetroTrackerService extends Service {
    public static final String PREFS = "metro_tracker";
    public static final String JOURNEY_KEY = "journey";
    public static final String ACTION_START = "com.hydmetro.tracker.START";
    private static final String CHANNEL = "metro_tracking";
    private WindowManager wm; private LinearLayout panel; private TextView ball; private TextView info;
    private LocationManager lm; private LocationListener listener; private Handler handler = new Handler(Looper.getMainLooper());
    private boolean panelVisible = true, longFired = false; private long downAt = 0, lastTap = 0; private Runnable singleTap;
    private ArrayList<Stop> stops = new ArrayList<>(); private String destination = "—"; private double speedKmh = 0;

    static class Stop { String name; double lat,lng,dist; Stop(String n,double a,double b,double d){name=n;lat=a;lng=b;dist=d;} }

    @Override public void onCreate() { super.onCreate(); getSharedPreferences(PREFS,0).edit().putBoolean("vibrated_near",false).putBoolean("arrived",false).apply(); createChannel(); if(!startFg()){ stopSelf(); return; } loadJourney(); createOverlay(); startLocation(); }
    @Override public int onStartCommand(Intent i,int flags,int id){ if(i!=null && ACTION_START.equals(i.getAction())) { loadJourney(); } return START_STICKY; }
    @Override public IBinder onBind(Intent i){return null;}

    private void loadJourney(){
        stops.clear();
        String raw=getSharedPreferences(PREFS,0).getString(JOURNEY_KEY,"{}");
        try { JSONObject j=new JSONObject(raw); destination=j.optString("destName","—"); JSONArray a=j.getJSONArray("stops");
            for(int i=0;i<a.length();i++){ JSONObject s=a.getJSONObject(i); stops.add(new Stop(s.optString("name","—"),s.optDouble("lat"),s.optDouble("lng"),s.optDouble("dist"))); }
        } catch(Exception ignored){}
    }

    private boolean startFg(){
        try { Notification n=notification();
            if(Build.VERSION.SDK_INT>=29) startForeground(1001,n,android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION); else startForeground(1001,n);
            return true;
        } catch(Exception e){ return false; }
    }
    private Notification notification(){
        Intent open=getPackageManager().getLaunchIntentForPackage(getPackageName()); PendingIntent pi=PendingIntent.getActivity(this,1,open,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
        return new Notification.Builder(this,CHANNEL).setContentTitle("Hyd Metro Tracker").setContentText("Metro tracking is active").setSmallIcon(android.R.drawable.ic_dialog_map).setContentIntent(pi).setOngoing(true).build();
    }
    private void createChannel(){ if(Build.VERSION.SDK_INT>=26) ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(new NotificationChannel(CHANNEL,"Metro tracking",NotificationManager.IMPORTANCE_LOW)); }

    private TextView tv(String text,int size){ TextView t=new TextView(this); t.setText(text); t.setTextColor(Color.WHITE); t.setTextSize(size); t.setGravity(Gravity.CENTER_VERTICAL); return t; }
    private GradientDrawable bg(int color,float radius){ GradientDrawable g=new GradientDrawable(); g.setColor(color); g.setCornerRadius(radius); return g; }

    private int dp(float v){ return Math.round(v*getResources().getDisplayMetrics().density); }
    private WindowManager.LayoutParams bp; private float sx,sy; private int ox,oy; private boolean moved;
    private final Runnable longRun=()->{ longFired=true; hidePanel(); };

    private void createOverlay(){
        if(!Settings.canDrawOverlays(this)) return; wm=(WindowManager)getSystemService(WINDOW_SERVICE);
        android.util.DisplayMetrics dm=getResources().getDisplayMetrics();
        int type=Build.VERSION.SDK_INT>=26?WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY:WindowManager.LayoutParams.TYPE_PHONE;
        int rid=getResources().getIdentifier("status_bar_height","dimen","android"); int sb=rid>0?getResources().getDimensionPixelSize(rid):dp(24);
        panel=new LinearLayout(this); panel.setOrientation(LinearLayout.VERTICAL); panel.setPadding(dp(16),dp(12),dp(16),dp(12));
        GradientDrawable pbg=bg(0xEB16181B,dp(22)); pbg.setStroke(dp(1),0x33FFFFFF); panel.setBackground(pbg); panel.setElevation(dp(8));
        info=tv("HYD METRO  •  LIVE",11); info.setTextColor(0xFF36D978); info.setTypeface(Typeface.DEFAULT_BOLD); info.setLetterSpacing(0.12f); panel.addView(info,new LinearLayout.LayoutParams(-1,-2));
        TextView sub=tv("Next: —",14); sub.setId(100); sub.setTypeface(Typeface.DEFAULT_BOLD); sub.setPadding(0,dp(4),0,0); panel.addView(sub,new LinearLayout.LayoutParams(-1,-2));
        TextView dest=tv("Destination: "+destination,12); dest.setId(101); dest.setTextColor(0xFFB8BCC2); dest.setPadding(0,dp(2),0,0); panel.addView(dest,new LinearLayout.LayoutParams(-1,-2));
        // click-through: the bar never blocks taps on the app underneath
        WindowManager.LayoutParams pp=new WindowManager.LayoutParams(dm.widthPixels-dp(20),-2,type,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,-3);
        pp.gravity=Gravity.TOP|Gravity.CENTER_HORIZONTAL; pp.y=sb+dp(6);
        int size=dp(52); ball=tv("✦",22); ball.setGravity(Gravity.CENTER); GradientDrawable g=bg(0xF0141618,size); g.setStroke(dp(2),0xFF36D978); ball.setBackground(g); ball.setElevation(dp(10));
        bp=new WindowManager.LayoutParams(size,size,type,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,-3);
        bp.gravity=Gravity.TOP|Gravity.START; bp.x=dm.widthPixels-size-dp(8); bp.y=dm.heightPixels/2;
        ball.setOnTouchListener((v,e)->handleBall(e));
        try { wm.addView(panel,pp); wm.addView(ball,bp); } catch(Exception ignored){}
    }

    // tap = show/hide bar · drag = move ball · hold 3s = hide bar · double tap = stop
    private boolean handleBall(MotionEvent e){
        switch(e.getActionMasked()){
            case MotionEvent.ACTION_DOWN: longFired=false; moved=false; sx=e.getRawX(); sy=e.getRawY(); ox=bp.x; oy=bp.y; handler.postDelayed(longRun,3000); return true;
            case MotionEvent.ACTION_MOVE: { float dx=e.getRawX()-sx, dy=e.getRawY()-sy;
                if(!moved && Math.hypot(dx,dy)>dp(8)){ moved=true; handler.removeCallbacks(longRun); }
                if(moved){ bp.x=(int)(ox+dx); bp.y=(int)(oy+dy); try{ wm.updateViewLayout(ball,bp); }catch(Exception ignored){} } return true; }
            case MotionEvent.ACTION_UP:
                handler.removeCallbacks(longRun);
                if(longFired||moved) return true;
                long now=SystemClock.elapsedRealtime();
                if(now-lastTap<350){ lastTap=0; if(singleTap!=null) handler.removeCallbacks(singleTap); stopSelf(); return true; }
                lastTap=now; singleTap=()->togglePanel(); handler.postDelayed(singleTap,360); return true;
            case MotionEvent.ACTION_CANCEL: handler.removeCallbacks(longRun); return true;
        } return true;
    }
    private void togglePanel(){ if(panel==null)return; panelVisible=!panelVisible; panel.setVisibility(panelVisible?View.VISIBLE:View.GONE); }
    private void hidePanel(){ if(panel!=null){ panelVisible=false; panel.setVisibility(View.GONE); vibrate(new long[]{0,60}); } }

    private void startLocation(){
        lm=(LocationManager)getSystemService(LOCATION_SERVICE); if(checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED && checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)!=PackageManager.PERMISSION_GRANTED)return;
        listener=new LocationListener(){ @Override public void onLocationChanged(Location l){ speedKmh=l.hasSpeed()?Math.max(0,l.getSpeed()*3.6):speedKmh; update(l); } };
        try { lm.requestLocationUpdates(LocationManager.GPS_PROVIDER,1000,2,listener,Looper.getMainLooper()); } catch(Exception ignored){}
    }
    private double dist(double lat1,double lon1,double lat2,double lon2){ double r=6371000,d=Math.PI/180; double a=Math.sin((lat2-lat1)*d/2)*Math.sin((lat2-lat1)*d/2)+Math.cos(lat1*d)*Math.cos(lat2*d)*Math.sin((lon2-lon1)*d/2)*Math.sin((lon2-lon1)*d/2); return 2*r*Math.asin(Math.sqrt(a)); }
    private void update(Location l){
        if(stops.size()<2 || panel==null)return;
        int best=0; double bestD=Double.MAX_VALUE; double bestAlong=0;
        for(int i=0;i<stops.size()-1;i++){
            Stop a=stops.get(i),b=stops.get(i+1); double kx=Math.cos(((a.lat+b.lat)/2)*Math.PI/180)*111320, ky=110540; double bx=(b.lng-a.lng)*kx,by=(b.lat-a.lat)*ky,px=(l.getLongitude()-a.lng)*kx,py=(l.getLatitude()-a.lat)*ky; double t=(bx*bx+by*by)==0?0:(px*bx+py*by)/(bx*bx+by*by); t=Math.max(0,Math.min(1,t)); double slat=a.lat+(b.lat-a.lat)*t, slon=a.lng+(b.lng-a.lng)*t; double od=dist(l.getLatitude(),l.getLongitude(),slat,slon); if(od<bestD){bestD=od;best=i;bestAlong=a.dist+(b.dist-a.dist)*t;}}
        int next=stops.size()-1; for(int i=0;i<stops.size();i++)if(stops.get(i).dist>bestAlong+25){next=i;break;}
        int past=Math.max(0,next-1); double toNext=Math.max(0,stops.get(next).dist-bestAlong); double remaining=Math.max(0,stops.get(stops.size()-1).dist-bestAlong); double v=speedKmh>3?speedKmh/3.6:9; long eta=Math.round(toNext/v); long destEta=Math.round(remaining/v); String pastName=stops.get(past).name, nextName=remaining<=60?"Arrived":stops.get(next).name;
        TextView sub=(TextView)panel.findViewById(100); sub.setText("Next: "+nextName+"  •  "+(eta<60?eta+"s":(eta/60)+"m")+"  •  "+Math.round(speedKmh)+" km/h");
        TextView de=(TextView)panel.findViewById(101); de.setText("Destination: "+destination+"   •   ETA "+(destEta<60?destEta+"s":(destEta/60)+"m"));
        if(remaining<600 && remaining>60){ getSharedPreferences(PREFS,0).edit().putBoolean("dest_alerted",true).apply(); }
        if(remaining<=600 && remaining>60 && !getSharedPreferences(PREFS,0).getBoolean("vibrated_near",false)){getSharedPreferences(PREFS,0).edit().putBoolean("vibrated_near",true).apply(); vibrate(new long[]{0,300,120,300,120,500});}
        if(remaining<=60 && !getSharedPreferences(PREFS,0).getBoolean("arrived",false)){getSharedPreferences(PREFS,0).edit().putBoolean("arrived",true).apply(); vibrate(new long[]{0,400,150,400,150,700});}
    }
    private void vibrate(long[] pattern){ try { Vibrator v=(Vibrator)getSystemService(VIBRATOR_SERVICE); if(v!=null){ if(Build.VERSION.SDK_INT>=26)v.vibrate(VibrationEffect.createWaveform(pattern,-1)); else v.vibrate(pattern,-1); } }catch(Exception ignored){} }
    @Override public void onDestroy(){ if(lm!=null && listener!=null)try{lm.removeUpdates(listener);}catch(Exception ignored){} if(wm!=null){ try{if(panel!=null)wm.removeView(panel);}catch(Exception ignored){} try{if(ball!=null)wm.removeView(ball);}catch(Exception ignored){} } super.onDestroy(); }
}
