package mali.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

/** زمان‌بندی یادآوری سررسید اقساط (اعلان محلی؛ بدون اینترنت). */
final class Reminders {
    static final String CHANNEL = "mali_due";
    private static final String PREF = "reminders";
    private static final String KEY = "json";

    private Reminders() {
    }

    static void ensureChannel(Context c) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel ch = new NotificationChannel(CHANNEL, "سررسید اقساط", NotificationManager.IMPORTANCE_HIGH);
            nm.createNotificationChannel(ch);
        }
    }

    private static PendingIntent pending(Context c, int id, String title, String text) {
        Intent i = new Intent(c, ReminderReceiver.class);
        i.setAction("mali.app.REMIND." + id);
        i.putExtra("id", id);
        i.putExtra("title", title);
        i.putExtra("text", text);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getBroadcast(c, id, i, flags);
    }

    /** همه یادآوری‌های قبلی را لغو و فهرست جدید (آرایه JSON) را زمان‌بندی می‌کند. */
    static void schedule(Context c, String json) {
        SharedPreferences sp = c.getSharedPreferences(PREF, Context.MODE_PRIVATE);
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        try {
            String old = sp.getString(KEY, "[]");
            JSONArray oa = new JSONArray(old);
            for (int k = 0; k < oa.length(); k++) {
                JSONObject o = oa.getJSONObject(k);
                am.cancel(pending(c, o.getInt("id"), "", ""));
            }
        } catch (Exception e) {
            // ignore
        }
        sp.edit().putString(KEY, json).apply();
        ensureChannel(c);
        arm(c, am, json);
    }

    /** بعد از روشن‌شدن گوشی، یادآوری‌های ذخیره‌شده دوباره برپا می‌شوند. */
    static void restore(Context c) {
        SharedPreferences sp = c.getSharedPreferences(PREF, Context.MODE_PRIVATE);
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        ensureChannel(c);
        arm(c, am, sp.getString(KEY, "[]"));
    }

    private static void arm(Context c, AlarmManager am, String json) {
        try {
            JSONArray a = new JSONArray(json);
            long now = System.currentTimeMillis();
            for (int k = 0; k < a.length(); k++) {
                JSONObject o = a.getJSONObject(k);
                long at = o.getLong("at");
                if (at <= now) {
                    continue;
                }
                PendingIntent pi = pending(c, o.getInt("id"), o.optString("title"), o.optString("text"));
                if (Build.VERSION.SDK_INT >= 23) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
                } else {
                    am.set(AlarmManager.RTC_WAKEUP, at, pi);
                }
            }
        } catch (Exception e) {
            // ignore
        }
    }
}
