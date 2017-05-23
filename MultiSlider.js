'use strict';

import React, { PropTypes } from 'react';

import {
  StyleSheet,
  PanResponder,
  View,
  TouchableHighlight,
  Platform,
} from 'react-native';

import DefaultMarker from './DefaultMarker';
import { createArray, valueToPosition, positionToValue } from './converters';

export default class MultiSlider extends React.Component {
  static propTypes = {
    value: PropTypes.arrayOf(PropTypes.number),

    onValuesChangeStart: PropTypes.func,
    onValuesChange: PropTypes.func,
    onValuesChangeFinish: PropTypes.func,

    sliderLength: PropTypes.number,
    touchDimensions: PropTypes.object,

    customMarker: PropTypes.func,

    min: PropTypes.number,
    max: PropTypes.number,
    step: PropTypes.number,

    optionsArray: PropTypes.array,

    containerStyle: View.propTypes.style,
    trackStyle: View.propTypes.style,
    selectedStyle: View.propTypes.style,
    unselectedStyle: View.propTypes.style,
    markerStyle: View.propTypes.style,
    pressedMarkerStyle: View.propTypes.style,
  };

  static defaultProps = {
    value: 0,
    onValuesChangeStart: () => {},
    onValuesChange: values => {},
    onValuesChangeFinish: values => {},
    step: 1,
    min: 0,
    max: 10,
    touchDimensions: {
      height: 50,
      width: 50,
      borderRadius: 15,
      slipDisplacement: 200,
    },
    customMarker: DefaultMarker,
    sliderLength: 280,
  };

  constructor(props) {
    super(props);

    this.optionsArray = this.props.optionsArray ||
      createArray(this.props.min, this.props.max, this.props.step);
    this.stepLength = this.props.sliderLength / this.optionsArray.length;

    var initialValue = valueToPosition(this.props.value, this.optionsArray, this.props.sliderLength)

    this.state = {
      pressedOne: true,
      valueOne: this.props.value,
      pastOne: initialValue,
      positionOne: initialValue,
    };
  }

  componentWillMount() {
    var customPanResponder = (start, move, end) => {
      return PanResponder.create({
        onStartShouldSetPanResponder: (evt, gestureState) => true,
        onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
        onMoveShouldSetPanResponder: (evt, gestureState) => true,
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
        onPanResponderGrant: (evt, gestureState) => start(),
        onPanResponderMove: (evt, gestureState) => move(gestureState),
        onPanResponderTerminationRequest: (evt, gestureState) => true,
        onPanResponderRelease: (evt, gestureState) => end(gestureState),
        onPanResponderTerminate: (evt, gestureState) => end(gestureState),
        onShouldBlockNativeResponder: (evt, gestureState) => true,
      });
    };

    this._panResponderOne = customPanResponder(
      this.startOne,
      this.moveOne,
      this.endOne,
    );
  }

  componentWillReceiveProps(nextProps) {
    if (this.state.onePressed) return;

    let position, nextState = {};
    if (
      nextProps.value !== this.state.valueOne ||
      nextProps.sliderLength !== this.props.sliderLength
    ) {
      position = valueToPosition(
        nextProps.value,
        this.optionsArray,
        nextProps.sliderLength,
      );
      nextState.valueOne = nextProps.value;
      nextState.pastOne = position;
      nextState.positionOne = position;
    }

    if (nextState != {}) {
      this.setState(nextState);
    }
  }

  startOne = () => {
    this.props.onValuesChangeStart();
    this.setState({
      onePressed: !this.state.onePressed,
    });
  };

  moveOne = gestureState => {
    var unconfined = gestureState.dx + this.state.pastOne;
    var bottom = 0;
    var trueTop = 0;
    var top = this.props.sliderLength;
    var confined = unconfined < bottom
      ? bottom
      : unconfined > top ? top : unconfined;
    var value = positionToValue(
      this.state.positionOne,
      this.optionsArray,
      this.props.sliderLength,
    );

    var slipDisplacement = this.props.touchDimensions.slipDisplacement;

    if (Math.abs(gestureState.dy) < slipDisplacement || !slipDisplacement) {
      this.setState({
        positionOne: confined,
      });
    }

    if (value !== this.state.valueOne) {
      this.setState(
        {
          valueOne: value,
        },
        () => {
          var change = [this.state.valueOne];
          this.props.onValuesChange(change);
        },
      );
    }
  };

  endOne = gestureState => {
    this.setState(
      {
        pastOne: this.state.positionOne,
        onePressed: !this.state.onePressed,
      },
      () => {
        var change = [this.state.valueOne];
        this.props.onValuesChangeFinish(change);
      },
    );
  };

  render() {
    const { positionOne } = this.state;
    const { selectedStyle, unselectedStyle, sliderLength } = this.props;

    const trackOneLength = positionOne;
    const trackOneStyle = selectedStyle || styles.selectedTrack;
    const trackTwoLength = sliderLength - trackOneLength;
    const trackTwoStyle = unselectedStyle;
    const Marker = this.props.customMarker;
    const {
      slipDisplacement,
      height,
      width,
      borderRadius,
    } = this.props.touchDimensions;
    const touchStyle = {
      borderRadius: borderRadius || 0,
    };

    const markerContainerOne = { top: -24, left: trackOneLength - 24 };

    return (
      <View style={[styles.container, this.props.containerStyle]}>
        <View style={[styles.fullTrack, { width: sliderLength }]}>
          <View
            style={[
              styles.track,
              this.props.trackStyle,
              trackOneStyle,
              { width: trackOneLength },
            ]}
          />
          <View
            style={[
              styles.track,
              this.props.trackStyle,
              trackTwoStyle,
              { width: trackTwoLength },
            ]}
          />
          <View
            style={[
              styles.markerContainer,
              markerContainerOne,
              positionOne > sliderLength / 2 && styles.topMarkerContainer,
            ]}
          >
            <View
              style={[styles.touch, touchStyle]}
              ref={component => this._markerOne = component}
              {...this._panResponderOne.panHandlers}
            >
              <Marker
                pressed={this.state.onePressed}
                markerStyle={[styles.marker, this.props.markerStyle]}
                pressedMarkerStyle={this.props.pressedMarkerStyle}
                currentValue={this.state.valueOne}
              />
            </View>
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    height: 50,
  },
  fullTrack: {
    flexDirection: 'row',
  },
  track: {
    ...Platform.select({
      ios: {
        height: 2,
        borderRadius: 2,
        backgroundColor: '#A7A7A7',
      },
      android: {
        height: 2,
        backgroundColor: '#CECECE',
      },
    }),
  },
  selectedTrack: {
    ...Platform.select({
      ios: {
        backgroundColor: '#095FFF',
      },
      android: {
        backgroundColor: '#0D8675',
      },
    }),
  },
  markerContainer: {
    position: 'absolute',
    width: 48,
    height: 48,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topMarkerContainer: {
    zIndex: 1,
  },
  touch: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
});
