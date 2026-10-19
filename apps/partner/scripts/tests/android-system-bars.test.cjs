/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('native bar compatibility preserves old Android and avoids obsolete calls on Android 15+', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'partner-system-bars-'));
  const write = (file, text) => {
    const dest = path.join(dir, file); mkdirSync(path.dirname(dest), { recursive: true }); writeFileSync(dest, text); return dest;
  };
  const java = tool => process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', tool) : tool;
  const files = [
    write('android/os/Build.java', 'package android.os; public class Build { public static class VERSION { public static int SDK_INT; } }'),
    write('android/view/WindowManager.java', 'package android.view; public class WindowManager { public static class LayoutParams { public int layoutInDisplayCutoutMode; } }'),
    write('android/view/Window.java', `package android.view; public class Window {
      public int reads, writes, status, navigation;
      public void setStatusBarColor(int c) { writes++; status=c; }
      public int getStatusBarColor() { reads++; return status; }
      public void setNavigationBarColor(int c) { writes++; navigation=c; }
      public int getNavigationBarColor() { reads++; return navigation; }
    }`),
    write('PolicyTest.java', `import android.os.Build; import android.view.*; import com.gloceries.partner.releasequality.SystemBarCompat;
      public class PolicyTest {
        static void check(boolean b) { if(!b) throw new AssertionError(); }
        public static void main(String[] args) {
          for(int sdk : new int[]{24,28,29,30,34,35,36}) {
            Build.VERSION.SDK_INT=sdk; Window w=new Window();
            SystemBarCompat.setStatusBarColor(w,123); SystemBarCompat.setNavigationBarColor(w,456);
            int s=SystemBarCompat.getStatusBarColor(w),n=SystemBarCompat.getNavigationBarColor(w);
            check(sdk<35 ? (w.writes==2 && w.reads==2 && s==123 && n==456) : (w.writes==0 && w.reads==0 && s==0 && n==0));
            for(int mode=0;mode<=3;mode++) {
              WindowManager.LayoutParams p=new WindowManager.LayoutParams(); SystemBarCompat.setCutoutMode(p,mode);
              check(p.layoutInDisplayCutoutMode==(sdk<28 ? 0 : sdk>=30 && mode<=1 ? 3 : mode));
            }
          }
        }
      }`),
    path.resolve(__dirname, '../../native-release-quality/app/com/gloceries/partner/releasequality/SystemBarCompat.java'),
  ];
  try {
    const compile = spawnSync(java('javac'), ['-d', dir, ...files], { encoding: 'utf8' });
    assert.equal(compile.status, 0, compile.stderr || compile.error?.message);
    const run = spawnSync(java('java'), ['-cp', dir, 'PolicyTest'], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr || run.error?.message);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
