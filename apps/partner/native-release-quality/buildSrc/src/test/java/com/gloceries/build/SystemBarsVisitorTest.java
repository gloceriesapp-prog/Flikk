package com.gloceries.build;

import org.junit.Test;
import static org.junit.Assert.*;
import org.objectweb.asm.*;
import java.util.*;

public class SystemBarsVisitorTest {
  @Test public void redirectsWindowCallsAndCutoutWritesWithoutChangingOtherCalls() {
    ClassWriter writer = new ClassWriter(0);
    ClassVisitor v = SystemBarsVisitorFactory.visitor(writer);
    v.visit(Opcodes.V1_8, Opcodes.ACC_PUBLIC, "Fixture", null, "java/lang/Object", null);
    MethodVisitor m = v.visitMethod(Opcodes.ACC_PUBLIC | Opcodes.ACC_STATIC, "apply", "(Landroid/view/Window;Landroid/view/WindowManager$LayoutParams;)V", null, null);
    m.visitCode();
    m.visitVarInsn(Opcodes.ALOAD,0); m.visitInsn(Opcodes.ICONST_1);
    m.visitMethodInsn(Opcodes.INVOKEVIRTUAL, "android/view/Window", "setStatusBarColor", "(I)V", false);
    m.visitVarInsn(Opcodes.ALOAD,0);
    m.visitMethodInsn(Opcodes.INVOKEVIRTUAL, "android/view/Window", "getStatusBarColor", "()I", false); m.visitInsn(Opcodes.POP);
    m.visitVarInsn(Opcodes.ALOAD,0); m.visitInsn(Opcodes.ICONST_1);
    m.visitMethodInsn(Opcodes.INVOKEVIRTUAL, "android/view/Window", "setNavigationBarColor", "(I)V", false);
    m.visitVarInsn(Opcodes.ALOAD,0);
    m.visitMethodInsn(Opcodes.INVOKEVIRTUAL, "android/view/Window", "getNavigationBarColor", "()I", false); m.visitInsn(Opcodes.POP);
    m.visitVarInsn(Opcodes.ALOAD,1); m.visitInsn(Opcodes.ICONST_1);
    m.visitFieldInsn(Opcodes.PUTFIELD, "android/view/WindowManager$LayoutParams", "layoutInDisplayCutoutMode", "I");
    m.visitVarInsn(Opcodes.ALOAD,0);
    m.visitMethodInsn(Opcodes.INVOKEVIRTUAL, "android/view/Window", "getDecorView", "()Landroid/view/View;", false); m.visitInsn(Opcodes.POP);
    m.visitInsn(Opcodes.RETURN); m.visitMaxs(2, 2); m.visitEnd(); v.visitEnd();
    List<String> calls = new ArrayList<>();
    new ClassReader(writer.toByteArray()).accept(new ClassVisitor(Opcodes.ASM9) {
      @Override public MethodVisitor visitMethod(int a,String n,String d,String s,String[] e) {
        return new MethodVisitor(Opcodes.ASM9) {
          @Override public void visitMethodInsn(int op,String owner,String method,String desc,boolean inter) {
            calls.add(owner+"."+method+desc);
            if (owner.equals(SystemBarsVisitorFactory.COMPAT)) assertEquals(Opcodes.INVOKESTATIC, op);
          }
          @Override public void visitFieldInsn(int op,String owner,String field,String desc) {
            fail("cutout write must pass through the API-level policy");
          }
        };
      }
    },0);
    assertEquals(6,calls.size());
    assertEquals(SystemBarsVisitorFactory.COMPAT+".setStatusBarColor(Landroid/view/Window;I)V",calls.get(0));
    assertEquals(SystemBarsVisitorFactory.COMPAT+".getStatusBarColor(Landroid/view/Window;)I",calls.get(1));
    assertEquals(SystemBarsVisitorFactory.COMPAT+".setNavigationBarColor(Landroid/view/Window;I)V",calls.get(2));
    assertEquals(SystemBarsVisitorFactory.COMPAT+".getNavigationBarColor(Landroid/view/Window;)I",calls.get(3));
    assertTrue(calls.get(4).contains(".setCutoutMode("));
    assertEquals("android/view/Window.getDecorView()Landroid/view/View;",calls.get(5));
  }
}
