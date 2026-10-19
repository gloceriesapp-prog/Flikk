package com.gloceries.build

import org.gradle.api.Plugin
import org.gradle.api.Project
import com.android.build.api.variant.AndroidComponentsExtension
import com.android.build.api.instrumentation.InstrumentationScope
import com.android.build.api.instrumentation.FramesComputationMode

class ReleaseQualityPlugin implements Plugin<Project> {
  void apply(Project project) {
    project.plugins.withId('com.android.application') {
      def components = project.extensions.getByType(AndroidComponentsExtension)
      components.onVariants(components.selector().withBuildType('release')) { variant ->
        variant.instrumentation.transformClassesWith(SystemBarsVisitorFactory, InstrumentationScope.ALL) {}
        // Replacements have exactly the same operands/results as the original
        // instructions. Preserve frames instead of resolving unrelated library types.
        variant.instrumentation.setAsmFramesComputationMode(FramesComputationMode.COPY_FRAMES)
      }
    }
  }
}
