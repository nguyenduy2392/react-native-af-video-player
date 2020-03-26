import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
  View,
  Animated,
  StyleSheet,
  TouchableWithoutFeedback as Touchable,
  Text
} from 'react-native'
import {
  PlayButton,
  ControlBar,
  Loading,
  TopBar,
  ProgressBar
} from './'
import Icons from 'react-native-vector-icons/MaterialIcons'

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99
  },
  flex: {
    flex: 1
  },
  containerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
})

class Controls extends Component {
  constructor() {
    super()
    this.state = {
      hideControls: false,
      seconds: 0,
      seeking: false
    }
    this.animControls = new Animated.Value(1)
    this.scale = new Animated.Value(1)
    this.progressbar = new Animated.Value(2)
  }

  componentDidMount() {
    this.setTimer()
  }

  componentWillUnmount() {
    clearInterval(this.timer)
  }

  onSeek(pos) {
    this.props.onSeek(pos)
    if (!this.state.seeking) {
      this.setState({ seeking: true })
    }
  }

  onSeekRelease(pos) {
    this.props.onSeekRelease(pos)
    this.setState({ seeking: false, seconds: 0 })
  }

  setTimer() {
    this.timer = setInterval(() => {
      switch (true) {
        case this.state.seeking:
          // do nothing
          break
        case this.props.paused:
          if (this.state.seconds > 0) this.setState({ seconds: 0 })
          break
        case this.state.hideControls:
          break
        case this.state.seconds > this.props.controlDuration:
          this.hideControls()
          break
        default:
          this.setState({ seconds: this.state.seconds + 1 })
      }
    }, 1000)
  }

  showControls() {
    this.setState({ hideControls: false }, () => {
      this.progressbar.setValue(2)
      Animated.parallel([
        Animated.timing(this.animControls, { toValue: 1, duration: 200 }),
        Animated.timing(this.scale, { toValue: 1, duration: 200 })
      ]).start()
    })
  }

  hideControls() {
    Animated.parallel([
      Animated.timing(this.animControls, { toValue: 0, duration: 200 }),
      Animated.timing(this.scale, { toValue: 0.25, duration: 200 })
    ]).start(() => this.setState({ hideControls: true, seconds: 0 }))
  }

  hiddenControls() {
    Animated.timing(this.progressbar, { toValue: 0, duration: 200 }).start()
    return (
      <Touchable style={styles.container} onPress={() => this.showControls()}>
        <Animated.View style={[styles.container, { paddingBottom: this.progressbar }]}>
          <ProgressBar theme={this.props.theme.progress} progress={this.props.progress} />
        </Animated.View>
      </Touchable>
    )
  }

  loading() {
    const {
      logo,
      more,
      onMorePress,
      title,
      theme,
    } = this.props
    return (
      <View style={styles.container}>
        <TopBar
          title={title}
          logo={logo}
          more={more}
          onMorePress={() => onMorePress()}
          theme={{ title: theme.title, more: theme.more }}
        />
        <Loading theme={this.props.theme.loading} />
      </View>
    )
  }

  renderError() {
    const {
      logo,
      more,
      onMorePress,
      title,
      theme
    } = this.props
    // const inline = {
    //   height: this.animInline,
    //   alignSelf: 'stretch'
    // }
    const textStyle = { color: 'white', padding: 10 }
    return (
      <View style={styles.container}>
        {more &&
          <TopBar
            title={title}
            logo={logo}
            more={more}
            onMorePress={() => onMorePress()}
            theme={{ title: theme.title, more: theme.more }}
          />
        }
        <View style={styles.containerCenter}>
          <Text style={textStyle}>{this.props.errorMess ? this.props.errorMess : 'Retry'}</Text>
          <Icons
            name="replay"
            size={60}
            color={this.props.theme && this.props.theme.center ? this.props.theme.center : 'white'}
            onPress={() => this.props.setStateError({ renderError: false })}
          />
        </View>
      </View>
    )
  }

  displayedControls() {
    const {
      paused,
      fullscreen,
      muted,
      loading,
      logo,
      more,
      onMorePress,
      title,
      progress,
      currentTime,
      duration,
      theme,
      inlineOnly,
      hideFullScreenControl
    } = this.props

    const { center, ...controlBar } = theme

    return (
      <Touchable onPress={() => this.hideControls()}>
        <Animated.View style={[styles.container, { opacity: this.animControls }]}>
          <TopBar
            title={title}
            logo={logo}
            more={more}
            onMorePress={() => onMorePress()}
            theme={{ title: theme.title, more: theme.more }}
          />
          <Animated.View style={[styles.flex, { transform: [{ scale: this.scale }] }]}>
            <PlayButton
              onPress={() => this.props.togglePlay()}
              paused={paused}
              loading={loading}
              theme={center}
            />
          </Animated.View>
          <ControlBar
            toggleFS={() => this.props.toggleFS()}
            toggleMute={() => this.props.toggleMute()}
            togglePlay={() => this.props.togglePlay()}
            muted={muted}
            paused={paused}
            fullscreen={fullscreen}
            onSeek={pos => this.onSeek(pos)}
            onSeekRelease={pos => this.onSeekRelease(pos)}
            progress={progress}
            currentTime={currentTime}
            duration={duration}
            theme={controlBar}
            inlineOnly={inlineOnly}
            hideFullScreenControl={hideFullScreenControl}
          />
        </Animated.View>
      </Touchable>
    )
  }

  render() {
    if (this.props.renderError) return this.renderError()
    if (this.props.loading) return this.loading()
    if (this.state.hideControls) {
      return this.hiddenControls()
    }
    return this.displayedControls()
  }
}

Controls.propTypes = {
  toggleFS: PropTypes.func.isRequired,
  toggleMute: PropTypes.func.isRequired,
  togglePlay: PropTypes.func.isRequired,
  onSeek: PropTypes.func.isRequired,
  onSeekRelease: PropTypes.func.isRequired,
  onMorePress: PropTypes.func.isRequired,
  paused: PropTypes.bool.isRequired,
  inlineOnly: PropTypes.bool.isRequired,
//   hideFullScreenControl: PropTypes.bool.isRequired,
  fullscreen: PropTypes.bool.isRequired,
  muted: PropTypes.bool.isRequired,
  more: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  progress: PropTypes.number.isRequired,
  currentTime: PropTypes.number.isRequired,
  duration: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
//   logo: PropTypes.string.isRequired,
  theme: PropTypes.object.isRequired
}

export { Controls }
