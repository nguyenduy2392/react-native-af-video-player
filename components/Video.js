import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  BackHandler,
  Animated,
  Image,
  Alert
} from 'react-native'
import VideoPlayer from 'react-native-video'
import KeepAwake from 'react-native-keep-awake'
import Orientation from 'react-native-orientation'
import Icons from 'react-native-vector-icons/MaterialIcons'
import Lightbox from 'react-native-lightbox';
import { Controls, TopBar } from './'
import { checkSource } from './utils'
const Win = Dimensions.get('window')
const backgroundColor = '#000'

const styles = StyleSheet.create({
  background: {
    backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 98
  },
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
    zIndex: 99
  },
  container: {
    width: '100%',
    height: '100%'
  }
})

const defaultTheme = {
  title: '#FFF',
  more: '#FFF',
  center: '#FFF',
  fullscreen: '#FFF',
  volume: '#FFF',
  scrubberThumb: '#FFF',
  scrubberBar: '#FFF',
  seconds: '#FFF',
  duration: '#FFF',
  progress: '#FFF',
  loading: '#FFF'
}

class Video extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = {
      paused: !props.autoPlay,
      muted: false,
      fullScreen: false,
      inlineHeight: Win.width * 0.5625,
      loading: false,
      duration: 0,
      progress: 0,
      currentTime: 0,
      seeking: false,
      renderError: false
    }
    this.animInline = new Animated.Value(Win.width * 0.5625)
    this.animFullscreen = new Animated.Value(Win.width * 0.5625)
    this.BackHandler = this.BackHandler.bind(this)
    this.onRotated = this.onRotated.bind(this)
  }

  componentDidMount() {
    Dimensions.addEventListener('change', this.onRotated)
    BackHandler.addEventListener('hardwareBackPress', this.BackHandler)
  }

  componentWillUnmount() {
    Dimensions.removeEventListener('change', this.onRotated)
    BackHandler.removeEventListener('hardwareBackPress', this.BackHandler)
  }

  onLoadStart() {
    // this.setState({ paused: true, loading: true })
  }

  onLoad(data) {
    if (this.loadInfo) return
    this.loadInfo = true
    // if (!this.state.loading) return
    this.props.onLoad(data)
    const { height, width } = data.naturalSize
    const ratio = height === 'undefined' && width === 'undefined' ?
      (9 / 16) : (height / width)
    const inlineHeight = this.props.lockRatio ?
      (Win.width / this.props.lockRatio)
      : (Win.width * ratio)
    this.setState({
      paused: !this.props.autoPlay,
      loading: false,
      inlineHeight,
      duration: data.duration
    }, () => {
      Animated.timing(this.animInline, { toValue: inlineHeight, duration: 200 }).start()
      this.props.onPlay(!this.state.paused)
      if (!this.state.paused) {
        KeepAwake.activate()
        if (this.props.fullScreenOnly) {
          this.setState({ fullScreen: true }, () => {
            this.props.onFullScreen(this.state.fullScreen)
            this.animToFullscreen(Win.width)
            if (this.props.rotateToFullScreen) Orientation.lockToLandscape()
          })
        }
      }
    })
  }

  // onBuffer() {
  //   // console.log('buffering')
  //   this.setState({ loading: true, paused: true })
  // }

  onEnd() {
    this.props.onEnd()
    const { loop } = this.props
    if (!loop) this.pause()
    this.onSeekRelease(0)
    this.setState({ currentTime: 0 }, () => {
      if (!loop && this.controls) this.controls.showControls()
    })
  }

  onRotated({ window: { width, height } }) {
    // Add this condition incase if inline and fullscreen options are turned on
    if (this.props.inlineOnly) return
    const orientation = width > height ? 'LANDSCAPE' : 'PORTRAIT'
    if (this.props.rotateToFullScreen) {
      if (orientation === 'LANDSCAPE') {
        this.setState({ fullScreen: true }, () => {
          this.animToFullscreen(height)
          this.props.onFullScreen(this.state.fullScreen)
        })
        return
      }
      if (orientation === 'PORTRAIT') {
        this.setState({
          fullScreen: false,
          paused: this.props.fullScreenOnly || this.state.paused
        }, () => {
          this.animToInline()
          if (this.props.fullScreenOnly) this.props.onPlay(!this.state.paused)
          this.props.onFullScreen(this.state.fullScreen)
        })
        return
      }
    } else {
      this.animToInline()
    }
    if (this.state.fullScreen) this.animToFullscreen(height)
  }

  onSeekRelease(percent) {
    const seconds = percent * this.state.duration
    this.setState({ progress: percent, seeking: false }, () => {
      this.player.seek(seconds)
    })
  }

  onError(msg) {
    this.props.onError(msg)
    const { error } = this.props
    this.setState({ renderError: true }, () => {
      let type
      switch (true) {
        case error === false:
          type = error
          break
        case typeof error === 'object':
          // type = Alert.alert(error.title, error.message, error.button, error.options)
          break
        default:
          // type = Alert.alert('Oops!', 'There was an error playing this video, please try again later.', [{ text: 'Close' }])
          break
      }
      return type
    })
  }

  BackHandler() {
    if (this.state.fullScreen) {
      this.setState({ fullScreen: false }, () => {
        this.animToInline()
        this.props.onFullScreen(this.state.fullScreen)
        if (this.props.fullScreenOnly && !this.state.paused) this.togglePlay()
        if (this.props.rotateToFullScreen) Orientation.lockToPortrait()
        // setTimeout(() => {
        //   if (!this.props.lockPortraitOnFsExit) Orientation.unlockAllOrientations()
        // }, 1500)
      })
      return true
    }
    return false
  }

  pause() {
    if (!this.state.paused) this.togglePlay()
  }

  play() {
    if (this.state.paused) this.togglePlay()
  }

  togglePlay() {
    if (this.props.handlePlayIgnoreOrientation) {
      this.props.handleFullScreenIgnoreOrientation();
    } else {
      this.setState({ paused: !this.state.paused }, () => {
        this.props.onPlay(!this.state.paused)
        Orientation.getOrientation((e, orientation) => {
          if (this.props.inlineOnly) return
          if (!this.state.paused) {
            if (this.props.fullScreenOnly && !this.state.fullScreen) {
              this.setState({ fullScreen: true }, () => {
                this.props.onFullScreen(this.state.fullScreen)
                // const initialOrient = Orientation.getInitialOrientation()
                // const height = orientation !== initialOrient ?
                //   Win.width : Win.height
                const height = Win.width
                this.animToFullscreen(height)
                if (this.props.rotateToFullScreen) Orientation.lockToLandscape()
              })
            }
            KeepAwake.activate()
          } else {
            KeepAwake.deactivate()
          }
        })
      })
    }
  }

  toggleFS() {
    if (!this.props.miniRunOnScreen) {
      this.setState({ fullScreen: !this.state.fullScreen }, () => {
        this.props.onFullScreen(this.state.fullScreen)
      })

      if (this.lightboxRef) {
        if (!this.lightOpen) {
          this.lightOpen = true
          this.lightboxRef.open()
        } else {
          if (this.state.fullScreen) {
            this.lightOpen = false
            this.lightboxRef.close()
          }
          this.setState({ fullScreen: !this.state.fullScreen })
        }

      }
      if (this.props.handleFullScreenIgnoreOrientation) {
        this.props.handleFullScreenIgnoreOrientation();
      } else {
        this.setState({ fullScreen: !this.state.fullScreen }, () => {
          Orientation.getOrientation((e, orientation) => {
            if (this.state.fullScreen) {
              // const initialOrient = Orientation.getInitialOrientation()
              // const height = orientation !== initialOrient ?
              //   Win.width : Win.height
              const height = Win.width
              this.props.onFullScreen(this.state.fullScreen)
              if (this.props.rotateToFullScreen) Orientation.lockToLandscape()
              this.animToFullscreen(height)
            } else {
              if (this.props.fullScreenOnly) {
                this.setState({ paused: true }, () => this.props.onPlay(!this.state.paused))
              }
              this.props.onFullScreen(this.state.fullScreen)
              if (this.props.rotateToFullScreen) Orientation.lockToPortrait()
              this.animToInline()
              // setTimeout(() => {
              //   if (!this.props.lockPortraitOnFsExit) Orientation.unlockAllOrientations()
              // }, 1500)
            }
          })
        })
        if (this.props.handleFullScreen) {
          this.props.handleFullScreen();
        }
      }
    } else {
      if (this.state.fullScreen) {
        // this.animToInline()
        Orientation.lockToPortrait()
      }
      this.props.onFullScreen()
    }
  }

  animToFullscreen(height) {
    Animated.parallel([
      Animated.timing(this.animFullscreen, { toValue: height, duration: 200 }),
      Animated.timing(this.animInline, { toValue: height, duration: 200 })
    ]).start()
  }

  animToInline(height) {
    const newHeight = height || this.state.inlineHeight
    Animated.parallel([
      Animated.timing(this.animFullscreen, { toValue: newHeight, duration: 100 }),
      Animated.timing(this.animInline, { toValue: this.state.inlineHeight, duration: 100 })
    ]).start()
  }

  toggleMute() {
    this.setState({ muted: !this.state.muted })
  }

  seek(percent) {
    const currentTime = percent * this.state.duration
    this.setState({ seeking: true, currentTime })
    // this.seekTo(currentTime)
  }

  seekTo(seconds) {
    const percent = seconds / this.state.duration
    if (seconds > this.state.duration) {
      throw new Error(`Current time (${seconds}) exceeded the duration ${this.state.duration}`)
      return false
    }
    return this.onSeekRelease(percent)
  }

  progress(time) {
    const { currentTime } = time
    const progress = currentTime / this.state.duration
    if (!this.state.seeking) {
      this.setState({ progress, currentTime }, () => {
        this.props.onProgress(time)
      })
    }
  }

  setStateError(error) {
    this.setState(error)
  }

  setLightboxRef = (ref) => {
    this.lightboxRef = ref
  }

  renderPlayer() {
    const {
      fullScreen,
      paused,
      muted,
      loading,
      progress,
      duration,
      inlineHeight,
      currentTime
    } = this.state

    const {
      url,
      loop,
      title,
      logo,
      rate,
      style,
      volume,
      placeholder,
      theme,
      onTimedMetadata,
      resizeMode,
      onMorePress,
      inlineOnly,
      playInBackground,
      playWhenInactive,
      controlDuration,
      hideFullScreenControl
    } = this.props

    const inline = {
      minHeight: inlineHeight,
      flex: 1,
      alignSelf: 'stretch'
    }

    const setTheme = {
      ...defaultTheme,
      ...theme
    }

    return (
      // <Lightbox ref={this.setLightboxRef} style={styles.container}>
      <Animated.View
        style={[
          styles.background,
          fullScreen ?
            (styles.fullScreen)
            : { flex: 1, height: this.props.size ? this.props.size.height : this.animInline },
          fullScreen ? null : style
        ]}
      >
        {/* <StatusBar hidden={fullScreen} /> */}
        {
          ((loading && placeholder) || currentTime < 0.01) &&
          <Image resizeMode="cover" resizeMethod='resize' style={styles.image} {...checkSource(placeholder)} />
        }
        <VideoPlayer
          {...checkSource(url)}
          paused={paused}
          resizeMode={resizeMode}
          repeat={loop}
          style={fullScreen ? styles.fullScreen : inline}
          ref={(ref) => { this.player = ref }}
          rate={rate}
          volume={volume}
          muted={muted}
          playInBackground={playInBackground} // Audio continues to play when app entering background.
          playWhenInactive={playWhenInactive} // [iOS] Video continues to play when control or notification center are shown.
          // progressUpdateInterval={250.0}          // [iOS] Interval to fire onProgress (default to ~250ms)
          onLoadStart={() => this.onLoadStart()} // Callback when video starts to load
          onLoad={e => this.onLoad(e)} // Callback when video loads
          onProgress={e => this.progress(e)} // Callback every ~250ms with currentTime
          onEnd={() => this.onEnd()}
          onError={e => this.onError(e)}
          // onBuffer={() => this.onBuffer()} // Callback when remote video is buffering
          onTimedMetadata={e => onTimedMetadata(e)} // Callback when the stream receive some metadata
        />
        {this.props.hiddenControls
          ? null
          :
          <Controls
            ref={(ref) => { this.controls = ref }}
            toggleMute={() => this.toggleMute()}
            toggleFS={() => this.toggleFS()}
            togglePlay={() => this.togglePlay()}
            paused={paused}
            muted={muted}
            fullscreen={fullScreen}
            loading={loading}
            onSeek={val => this.seek(val)}
            onSeekRelease={pos => this.onSeekRelease(pos)}
            progress={progress}
            currentTime={currentTime}
            duration={duration}
            logo={logo}
            title={title}
            more={!!onMorePress}
            onMorePress={() => onMorePress()}
            theme={setTheme}
            inlineOnly={inlineOnly}
            controlDuration={controlDuration}
            hideFullScreenControl={hideFullScreenControl}
            renderError={this.state.renderError}
            setStateError={(error) => this.setStateError(error)}
            errorMess={this.props.errorMess}
          />
        }
      </Animated.View>
      //</Lightbox>
    )
  }

  render() {
    // if (this.state.renderError) return this.renderError()
    return this.renderPlayer()
  }
}

Video.propTypes = {
  url: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]).isRequired,
  placeholder: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  style: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.number
  ]),
  error: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.object
  ]),
  loop: PropTypes.bool,
  autoPlay: PropTypes.bool,
  inlineOnly: PropTypes.bool,
  hideFullScreenControl: PropTypes.bool,
  fullScreenOnly: PropTypes.bool,
  playInBackground: PropTypes.bool,
  playWhenInactive: PropTypes.bool,
  rotateToFullScreen: PropTypes.bool,
  lockPortraitOnFsExit: PropTypes.bool,
  onEnd: PropTypes.func,
  onLoad: PropTypes.func,
  onPlay: PropTypes.func,
  onError: PropTypes.func,
  onProgress: PropTypes.func,
  onMorePress: PropTypes.func,
  onFullScreen: PropTypes.func,
  onTimedMetadata: PropTypes.func,
  rate: PropTypes.number,
  volume: PropTypes.number,
  lockRatio: PropTypes.number,
  logo: PropTypes.string,
  title: PropTypes.string,
  theme: PropTypes.object,
  resizeMode: PropTypes.string,
  controlDuration: PropTypes.number,
  miniRunOnScreen: PropTypes.bool
}

Video.defaultProps = {
  placeholder: undefined,
  style: {},
  error: true,
  loop: false,
  autoPlay: false,
  inlineOnly: false,
  fullScreenOnly: false,
  playInBackground: false,
  playWhenInactive: false,
  rotateToFullScreen: false,
  lockPortraitOnFsExit: false,
  onEnd: () => { },
  onLoad: () => { },
  onPlay: () => { },
  onError: () => { },
  onProgress: () => { },
  onMorePress: undefined,
  onFullScreen: () => { },
  onTimedMetadata: () => { },
  rate: 1,
  volume: 1,
  lockRatio: undefined,
  logo: undefined,
  title: '',
  theme: defaultTheme,
  resizeMode: 'contain',
  controlDuration: 3,
  miniRunOnScreen: false
}

export default Video
