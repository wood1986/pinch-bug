
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
    const [layout, setLayout] = useState<LayoutRectangle | null>(null);
    const distance = useSharedValue(0);

    const onEnd = (_: any, success: boolean) => {
      'worklet';
      active.value = false;
      lastTransform.value = transform.value
    };

    const manual = Gesture
      .Manual()
      .onTouchesDown((event, manager) => {
        if (event.numberOfTouches > 1) {
          const [touch0, touch1] = event.allTouches;
          distance.value = Math.sqrt(Math.pow(touch0.x - touch1.x, 2) + Math.pow(touch0.y - touch1.y, 2))
        }
      })
      .onTouchesUp((event, manager) => {
        for (const touch of event.changedTouches) {
          touches[touch.id].value = {
            visible: false,
            x: touch.x,
            y: touch.y,
          };
        }

        if (event.numberOfTouches === 0) {
          manager.end();
        }
      })
      .onTouchesMove((event, manager) => {
        for (const touch of event.changedTouches) {
          touches[touch.id].value = {
            visible: true,
            x: touch.x,
            y: touch.y,
          };
        }

        if (!layout) {
          return
        }

        if (event.numberOfTouches > 1) {
          const [touch0, touch1] = event.allTouches;
          const focal1 = [
            (touch0.x + touch1.x) / 2,
            (touch0.y + touch1.y) / 2
          ]
          const focal05 = [
            (focal1[0] / layout.width - 0.5) * layout.width,
            (focal1[1] / layout.height - 0.5) * layout.height,
          ];

          const scale = Math.sqrt(Math.pow(touch0.x - touch1.x, 2) + Math.pow(touch0.y - touch1.y, 2)) / distance.value

          let matrix = lastTransform.value;
          matrix = multiply3(matrix, [
            1, 0, focal05[0],
            0, 1, focal05[1],
            0, 0, 1,
          ]);
          matrix = multiply3(matrix, [
            scale, 0, 0,
            0, scale, 0,
            0, 0, 1
          ]);
          matrix = multiply3(matrix, [
            1, 0, -focal05[0],
            0, 1, -focal05[1],
            0, 0, 1,
          ]);
          transform.value = matrix;
        }
      })
      .onStart(() => {
        active.value = true;
      })
      .onEnd(onEnd)

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
      <GestureDetector gesture={manual}>
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
