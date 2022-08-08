
import React, { useState } from "react";
import { StyleSheet, LayoutRectangle, SafeAreaView, View, Button } from "react-native";
import { Gesture, GestureDetector, gestureHandlerRootHOC, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { identity3, Matrix3, multiply3 } from "react-native-redash";

interface Pointer {
  visible: boolean;
  x: number;
  y: number;
}

function PointerElement(props: {
  pointer: Animated.SharedValue<Pointer>;
  active: Animated.SharedValue<boolean>;
  index: number;
  transform: Animated.SharedValue<Matrix3>;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: props.pointer.value.x },
      { translateY: props.pointer.value.y },
      {
        scale:
          (props.pointer.value.visible ? 1 : 0) *
          (props.active.value ? 1.3 : 1) * 1 / props.transform.value[0],
      },
    ],
    backgroundColor: props.active.value ? 'red' : 'blue',
  }));

  return <Animated.View style={[styles.pointer, animatedStyle]} />;
}

const ImageViewer = gestureHandlerRootHOC(
  () => {
    const touches = Array(10)
      .fill(null)
      .map(() => useSharedValue<Pointer>({
        visible: false,
        x: 0,
        y: 0,
      }))
    const active = useSharedValue(false);
    const transform = useSharedValue(identity3);
    const lastTransform = useSharedValue(identity3);
    const focal = useSharedValue([0, 0]);
    const [layout, setLayout] = useState<LayoutRectangle | null>(null);

    const onEnd = (_: any, success: boolean) => {
      'worklet';
      lastTransform.value = transform.value
    };

    const manual = Gesture.Manual()
      .onTouchesDown((e, manager) => {
        for (const touch of e.changedTouches) {
          touches[touch.id].value = {
            visible: true,
            x: touch.x,
            y: touch.y,
          };
        }

        if (e.numberOfTouches >= 2) {
          manager.activate();
        }
      })
      .onTouchesMove((e, _manager) => {
        for (const touch of e.changedTouches) {
          touches[touch.id].value = {
            visible: true,
            x: touch.x,
            y: touch.y,
          };
        }
      })
      .onTouchesUp((e, manager) => {
        for (const touch of e.changedTouches) {
          touches[touch.id].value = {
            visible: false,
            x: touch.x,
            y: touch.y,
          };
        }

        if (e.numberOfTouches === 0) {
          manager.end();
        }
      })
      .onStart(() => {
        active.value = true;
      })
      .onEnd(() => {
        active.value = false;
      });

    const pan = Gesture.Pan()
      .maxPointers(1)
      .onChange(e => {
        transform.value = multiply3(lastTransform.value, [
          1,
          0,
          e.translationX / lastTransform.value[0],
          0,
          1,
          e.translationY / lastTransform.value[4],
          0,
          0,
          1,
        ]);
      })
      .onEnd(onEnd);

    const pinch = Gesture.Pinch()
      .onChange(e => {
        if (!layout) {
          return;
        }

        const focalX = e.focalX
        const focalY = e.focalY

        focal.value = [
          (focalX / layout.width - 0.5) * layout.width,
          (focalY / layout.height - 0.5) * layout.height,
        ];

        let matrix = lastTransform.value;
        matrix = multiply3(matrix, [
          1,
          0,
          focal.value[0],
          0,
          1,
          focal.value[1],
          0,
          0,
          1,
        ]);
        matrix = multiply3(matrix, [e.scale, 0, 0, 0, e.scale, 0, 0, 0, 1]);
        matrix = multiply3(matrix, [
          1,
          0,
          -focal.value[0],
          0,
          1,
          -focal.value[1],
          0,
          0,
          1,
        ]);
        transform.value = matrix;
      })
      .onEnd(onEnd);

      const animatedStyle = useAnimatedStyle(() => {
        return {
          transform: [
            {translateX: transform.value[2]},
            {translateY: transform.value[5]},
            {scaleX: transform.value[0]},
            {scaleY: transform.value[4]},
          ],
        };
      });

    return (
      <>
      <GestureDetector gesture={Gesture.Simultaneous(manual, pinch)}>
        <Animated.View
          collapsable={false}
          style={[styles.fullscreen, animatedStyle]}>
          <Animated.Image
            onLayout={e => {
              setLayout(e.nativeEvent.layout);
            }}
            source={require('./1.png') }
            resizeMode={'contain'}
            style={[styles.fullscreen]}
          />
          {touches.map((pointer, index) => (
            <PointerElement pointer={pointer} index={index} active={active} transform={transform} key={index} />
          ))}
        </Animated.View>
      </GestureDetector>
      <View style={{ position: 'absolute', end: 0, backgroundColor: 'black'}}>
        <Button title="RESET" onPress={() => {lastTransform.value = identity3; transform.value = identity3}}/>
      </View>
      </>
    );
  },
);

const styles = StyleSheet.create({
  fullscreen: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },

  pointer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'red',
    position: 'absolute',
    marginStart: -30,
    marginTop: -30,
  },
});

const App = () => {
  return <SafeAreaView style={{flex: 1, backgroundColor: 'black'}}>
    <GestureHandlerRootView style={{flex: 1}}>
      <ImageViewer />
    </GestureHandlerRootView>
  </SafeAreaView>
};

export default App;
