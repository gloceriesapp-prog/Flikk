// ponytail: rider is an npm-workspace member pinning its OWN react-native
// (0.86.2) while root hoists a different one (0.87.0). nativewind's className
// augmentation ships in react-native-css-interop, hoisted at root, so its
// `declare module "react-native"` binds to ROOT's ViewProps — never rider's
// local RN — leaving ~898 phantom "className does not exist" TS errors app-wide
// even though className works fine at runtime via babel. Re-declaring the same
// augmentation HERE resolves "react-native" from rider's own tree, so it binds
// to the RN the app actually compiles against. Verbatim mirror of
// react-native-css-interop/types.d.ts. Delete this file once rider's RN version
// matches root's (single hoisted copy) — then the upstream augmentation binds
// correctly on its own. Kept out of nativewind-env.d.ts on purpose: the `import`
// below makes this a module, and the `declare module '*.css'` wildcard there
// must stay in a global (import-free) file to keep matching side-effect imports.
import {
  ScrollViewProps,
  ScrollViewPropsAndroid,
  ScrollViewPropsIOS,
  Touchable,
  VirtualizedListProps,
} from 'react-native';

declare module '@react-native/virtualized-lists' {
  export interface VirtualizedListWithoutRenderItemProps<ItemT>
    extends ScrollViewProps {
    ListFooterComponentClassName?: string;
    ListHeaderComponentClassName?: string;
  }
}

declare module 'react-native' {
  interface ScrollViewProps
    extends ViewProps,
      ScrollViewPropsIOS,
      ScrollViewPropsAndroid,
      Touchable {
    contentContainerClassName?: string;
    indicatorClassName?: string;
  }
  interface FlatListProps<ItemT> extends VirtualizedListProps<ItemT> {
    columnWrapperClassName?: string;
  }
  interface ImageBackgroundProps extends ImagePropsBase {
    imageClassName?: string;
  }
  interface ImagePropsBase {
    className?: string;
    cssInterop?: boolean;
  }
  interface ViewProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface TextInputProps {
    placeholderClassName?: string;
  }
  interface TextProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface SwitchProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface InputAccessoryViewProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface TouchableWithoutFeedbackProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface StatusBarProps {
    className?: string;
    cssInterop?: boolean;
  }
  interface KeyboardAvoidingViewProps extends ViewProps {
    contentContainerClassName?: string;
  }
  interface ModalBaseProps {
    presentationClassName?: string;
  }
}
