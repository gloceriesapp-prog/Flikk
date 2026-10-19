package com.gloceries.build;

import com.android.build.api.instrumentation.AsmClassVisitorFactory;
import com.android.build.api.instrumentation.ClassContext;
import com.android.build.api.instrumentation.ClassData;
import com.android.build.api.instrumentation.InstrumentationParameters;
import org.objectweb.asm.ClassVisitor;
import org.objectweb.asm.MethodVisitor;
import org.objectweb.asm.Opcodes;

/** Applies the same API-level compatibility policy to precompiled dependencies. */
public abstract class SystemBarsVisitorFactory implements AsmClassVisitorFactory<InstrumentationParameters.None> {
  static final String COMPAT = "com/gloceries/partner/releasequality/SystemBarCompat";

  @Override public boolean isInstrumentable(ClassData data) {
    return !data.getClassName().startsWith("com.gloceries.partner.releasequality.");
  }

  @Override public ClassVisitor createClassVisitor(ClassContext context, ClassVisitor next) {
    return visitor(next);
  }

  static ClassVisitor visitor(ClassVisitor next) {
    return new ClassVisitor(Opcodes.ASM9, next) {
      @Override public MethodVisitor visitMethod(int access, String name, String desc, String sig, String[] exceptions) {
        return new MethodVisitor(Opcodes.ASM9, super.visitMethod(access, name, desc, sig, exceptions)) {
          @Override public void visitMethodInsn(int opcode, String owner, String method, String descriptor, boolean isInterface) {
            if (opcode == Opcodes.INVOKEVIRTUAL && owner.equals("android/view/Window")) {
              if ((method.equals("setStatusBarColor") || method.equals("setNavigationBarColor")) && descriptor.equals("(I)V")) {
                super.visitMethodInsn(Opcodes.INVOKESTATIC, COMPAT, method, "(Landroid/view/Window;I)V", false);
                return;
              }
              if ((method.equals("getStatusBarColor") || method.equals("getNavigationBarColor")) && descriptor.equals("()I")) {
                super.visitMethodInsn(Opcodes.INVOKESTATIC, COMPAT, method, "(Landroid/view/Window;)I", false);
                return;
              }
            }
            super.visitMethodInsn(opcode, owner, method, descriptor, isInterface);
          }
          @Override public void visitFieldInsn(int opcode, String owner, String field, String descriptor) {
            if (opcode == Opcodes.PUTFIELD && owner.equals("android/view/WindowManager$LayoutParams") && field.equals("layoutInDisplayCutoutMode") && descriptor.equals("I")) {
              super.visitMethodInsn(Opcodes.INVOKESTATIC, COMPAT, "setCutoutMode", "(Landroid/view/WindowManager$LayoutParams;I)V", false);
              return;
            }
            super.visitFieldInsn(opcode, owner, field, descriptor);
          }
        };
      }
    };
  }
}
