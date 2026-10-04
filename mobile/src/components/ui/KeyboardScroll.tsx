import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  findNodeHandle,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  type ScrollViewProps,
} from 'react-native';

/**
 * A scrolling page for forms. When the keyboard opens, the page grows by
 * the keyboard's height so its last field can be scrolled above it, and
 * the field being typed in is brought into view. Without this, a field
 * low on the screen (such as "confirm password") sits under the keyboard.
 *
 * Use it in place of ScrollView on any screen with a text field.
 */
export const KeyboardScroll = forwardRef<ScrollView, ScrollViewProps>(function KeyboardScroll(
  { contentContainerStyle, children, ...props },
  outer,
) {
  const ref = useRef<ScrollView>(null);
  // A screen may hold its own ref, for example to scroll back to the top.
  useImperativeHandle(outer, () => ref.current as ScrollView);
  const [keyboard, setKeyboard] = useState(0);

  useEffect(() => {
    // A browser moves the page itself.
    if (Platform.OS === 'web') return;
    const shown = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboard(e.endCoordinates.height);
      // Once the page has grown, bring the focused field above the keyboard.
      requestAnimationFrame(() => {
        const field = RNTextInput.State.currentlyFocusedInput();
        const node = field ? findNodeHandle(field as never) : null;
        if (node) ref.current?.scrollResponderScrollNativeHandleToKeyboard(node, 96, true);
      });
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  return (
    <ScrollView
      ref={ref}
      keyboardShouldPersistTaps="handled"
      {...props}
      contentContainerStyle={[contentContainerStyle, keyboard > 0 && { paddingBottom: (StyleSheet.flatten(contentContainerStyle)?.paddingBottom as number | undefined ?? 0) + keyboard }]}
    >
      {children}
    </ScrollView>
  );
});
export type KeyboardScroll = ScrollView;
