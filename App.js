/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import {View, Text, PermissionsAndroid, Button, Platform} from 'react-native';

// import {
//   Header,
//   LearnMoreLinks,
//   Colors,
//   DebugInstructions,
//   ReloadInstructions,
// } from 'react-native/Libraries/NewAppScreen';

import {OTSession, OTPublisher, OTSubscriber, OT} from 'opentok-react-native';
import RNCallKeep from 'react-native-callkeep';
import DeviceInfo from 'react-native-device-info';
import BackgroundTimer from 'react-native-background-timer';

import uuid from 'uuid';

const SERVER_BASE_URL = 'https://xyzopentokpoc.herokuapp.com';

// const options = {
//   ios: {
//     appName: 'My app name',
//   },
//   android: {
//     alertTitle: 'Permissions required',
//     alertDescription: 'This application needs to access your phone accounts',
//     cancelButton: 'Cancel',
//     okButton: 'ok',
//     imageName: 'phone_account_icon',
//     additionalPermissions: [PermissionsAndroid.PERMISSIONS.example],
//   },
// };

RNCallKeep.setup({
  ios: {
    appName: 'CallKeepDemo',
  },
  android: {
    alertTitle: 'Permissions required',
    alertDescription: 'This application needs to access your phone accounts',
    cancelButton: 'Cancel',
    okButton: 'ok',
  },
});

const getNewUuid = () => uuid.v4().toLowerCase();

const format = pUUid => pUUid.split('-')[0];

const getRandomNumber = () => String(Math.floor(Math.random() * 100000));

const isIOS = Platform.OS === 'ios';

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      apiKey: null,
      sessionId: null,
      token: null,
      isConnected: false,
      signal: {
        data: '',
        type: '',
      },
      text: '',
      messages: [],
    };
    RNCallKeep.setAvailable(true);

    this.connectedClientId = [];
    OT.enableLogs(true);
    this.otSessionRef = React.createRef();
    this.sessionEventHandlers = {
      streamCreated: event => {
        console.log('Stream created!', event);
      },
      streamDestroyed: event => {
        console.log('Stream destroyed!', event);
      },
      sessionConnected: event => {
        console.log('session connected', event);
        this.setState({
          isConnected: true,
        });
      },
      signal: event => {
        // this.playSound();
        console.log('Signal Received', event);
        this.displayIncomingCallNow();
      },
      connectionCreated: event => {
        console.log('another client connected connection crated', event);
        this.connectedClientId.push(event.connectionId);
        console.log(
          'another client connected connection crated - this.connectedClientId',
          this.connectedClientId,
        );
      },
      connectionDestroyed: event => {
        console.log('another client disconnected connection destroyed', event);
      },
    };

    this.sessionOptions = {
      connectionEventsSuppressed: true, // default is false
      // androidZOrder: '', // Android only - valid options are 'mediaOverlay' or 'onTop'
      // androidOnTop: '', // Android only - valid options are 'publisher' or 'subscriber'
      useTextureViews: true, // Android only - default is false
      isCamera2Capable: false, // Android only - default is false
      ipWhitelist: false, // https://tokbox.com/developer/sdks/js/reference/OT.html#initSession - ipWhitelist
    };

    this.publisherProperties = {
      publishAudio: true,
      publishVideo: false,
      cameraPosition: 'front',
    };

    this.subscriberProperties = {
      subscribeToAudio: true,
      subscribeToVideo: false,
      cameraPosition: 'front',
    };
  }

  componentDidMount() {
    fetch(SERVER_BASE_URL + '/session')
      .then(function(res) {
        return res.json();
      })
      .then(res => {
        console.log('res .....', res);
        const apiKey = res.apiKey;
        const sessionId = res.sessionId;
        const token = res.token;
        this.setState({apiKey, sessionId, token});
      })
      .catch(() => {});

    RNCallKeep.addEventListener('answerCall', this.answerCall);
    RNCallKeep.addEventListener(
      'didPerformDTMFAction',
      this.didPerformDTMFAction,
    );
    RNCallKeep.addEventListener(
      'didReceiveStartCallAction',
      this.didReceiveStartCallAction,
    );
    RNCallKeep.addEventListener(
      'didPerformSetMutedCallAction',
      this.didPerformSetMutedCallAction,
    );
    RNCallKeep.addEventListener(
      'didToggleHoldCallAction',
      this.didToggleHoldCallAction,
    );
    RNCallKeep.addEventListener('endCall', this.endCall);
  }

  componentWillUnmount() {
    RNCallKeep.removeEventListener('answerCall', this.answerCall);
    RNCallKeep.removeEventListener(
      'didPerformDTMFAction',
      this.didPerformDTMFAction,
    );
    RNCallKeep.removeEventListener(
      'didReceiveStartCallAction',
      this.didReceiveStartCallAction,
    );
    RNCallKeep.removeEventListener(
      'didPerformSetMutedCallAction',
      this.didPerformSetMutedCallAction,
    );
    RNCallKeep.removeEventListener(
      'didToggleHoldCallAction',
      this.didToggleHoldCallAction,
    );
    RNCallKeep.removeEventListener('endCall', this.endCall);
  }

  log = text => {
    console.info(text);
    const logText = this.state.logText;
    this.setState({logText: logText + '\n' + text});
  };

  addCall = (callUUID, number) => {
    this.setState({...this.state.heldCalls, [callUUID]: false});
    this.setState({...this.state.calls, [callUUID]: number});
  };

  removeCall = callUUID => {
    const {[callUUID]: _, ...updated} = this.state.calls;
    const {[callUUID]: __, ...updatedHeldCalls} = heldCalls;

    this.setState(updated);
    this.setState(updatedHeldCalls);
  };

  setCallHeld = (callUUID, held) => {
    this.setState({...this.state.heldCalls, [callUUID]: held});
  };

  setCallMuted = (callUUID, muted) => {
    this.setState({...this.state.mutedCalls, [callUUID]: muted});
  };

  displayIncomingCall = number => {
    const callUUID = getNewUuid();
    this.addCall(callUUID, number);

    this.log(`[displayIncomingCall] ${format(callUUID)}, number: ${number}`);

    RNCallKeep.displayIncomingCall(callUUID, number, number, 'number', false);
  };

  displayIncomingCallNow = () => {
    this.displayIncomingCall(getRandomNumber());
  };

  displayIncomingCallDelayed = () => {
    BackgroundTimer.setTimeout(() => {
      this.displayIncomingCall(getRandomNumber());
    }, 3000);
  };

  answerCall = ({callUUID}) => {
    const number = this.state.calls[callUUID];
    this.log(`[answerCall] ${format(callUUID)}, number: ${number}`);

    RNCallKeep.startCall(callUUID, number, number);

    BackgroundTimer.setTimeout(() => {
      this.log(`[setCurrentCallActive] ${format(callUUID)}, number: ${number}`);
      RNCallKeep.setCurrentCallActive(callUUID);
    }, 1000);
  };

  didPerformDTMFAction = ({callUUID, digits}) => {
    const number = this.state.calls[callUUID];
    this.log(
      `[didPerformDTMFAction] ${format(
        callUUID,
      )}, number: ${number} (${digits})`,
    );
  };

  didReceiveStartCallAction = ({handle}) => {
    if (!handle) {
      // @TODO: sometime we receive `didReceiveStartCallAction` with handle` undefined`
      return;
    }
    const callUUID = getNewUuid();
    this.addCall(callUUID, handle);

    this.log(`[didReceiveStartCallAction] ${callUUID}, number: ${handle}`);

    RNCallKeep.startCall(callUUID, handle, handle);

    BackgroundTimer.setTimeout(() => {
      this.log(`[setCurrentCallActive] ${format(callUUID)}, number: ${handle}`);
      RNCallKeep.setCurrentCallActive(callUUID);
    }, 1000);
  };

  didPerformSetMutedCallAction = ({muted, callUUID}) => {
    const number = this.state.calls[callUUID];
    this.log(
      `[didPerformSetMutedCallAction] ${format(
        callUUID,
      )}, number: ${number} (${muted})`,
    );

    this.setCallMuted(callUUID, muted);
  };

  didToggleHoldCallAction = ({hold, callUUID}) => {
    const number = this.state.calls[callUUID];
    this.log(
      `[didToggleHoldCallAction] ${format(
        callUUID,
      )}, number: ${number} (${hold})`,
    );

    this.setCallHeld(callUUID, hold);
  };

  endCall = ({callUUID}) => {
    const handle = this.state.calls[callUUID];
    this.log(`[endCall] ${format(callUUID)}, number: ${handle}`);

    this.removeCall(callUUID);
  };

  hangup = callUUID => {
    RNCallKeep.endCall(callUUID);
    this.removeCall(callUUID);
  };

  setOnHold = (callUUID, held) => {
    const handle = this.state.calls[callUUID];
    RNCallKeep.setOnHold(callUUID, held);
    this.log(`[setOnHold: ${held}] ${format(callUUID)}, number: ${handle}`);

    this.setCallHeld(callUUID, held);
  };

  setOnMute = (callUUID, muted) => {
    const handle = this.state.calls[callUUID];
    RNCallKeep.setMutedCall(callUUID, muted);
    this.log(`[setMutedCall: ${muted}] ${format(callUUID)}, number: ${handle}`);

    this.setCallMuted(callUUID, muted);
  };

  updateDisplay = callUUID => {
    const number = this.state.calls[callUUID];
    // Workaround because Android doesn't display well displayName, se we have to switch ...
    if (isIOS) {
      RNCallKeep.updateDisplay(callUUID, 'New Name', number);
    } else {
      RNCallKeep.updateDisplay(callUUID, number, 'New Name');
    }

    this.log(`[updateDisplay: ${number}] ${format(callUUID)}`);
  };

  sendSignal = () => {
    // this.showIncomingCall();
    const {isConnected} = this.state;
    if (isConnected) {
      this.otSessionRef.current.signal(
        {
          data: 'Chezhian',
          to: this.connectedClientId[0], // optional - connectionId of connected client you want to send the signal to
          type: 'Voice', // optional
        },
        error => {
          console.log('signal sent', error);
        },
      );
    }
  };

  // _keyExtractor = (item, index) => index;
  // _renderItem = ({item}) => <Text style={styles.item}>{item.data}</Text>;

  render() {
    console.log('this.state ....', this.state);
    return (
      <View
        style={{
          flex: 1,
          // flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 50,
        }}>
        {this.state.apiKey && (
          <OTSession
            apiKey={this.state.apiKey}
            sessionId={this.state.sessionId}
            token={this.state.token}
            eventHandlers={this.sessionEventHandlers}
            ref={this.otSessionRef}
            options={this.sessionOptions}
            subscribeToAudio={true}
            subscribeToVideo={false}
            videoSource={null}
            publishAudio={true}
            publishVideo={false}
            videTrack={false}
            audioTrack={true}>
            <Text>pulisher</Text>
            <OTPublisher
              style={{
                width: 300,
                height: 300,
                borderWidth: 1,
                borderColor: 'blue',
              }}
              properties={this.publisherProperties}
            />
            <Text>Subscrbe</Text>
            <OTSubscriber
              style={{
                width: 300,
                height: 300,
                borderWidth: 1,
                borderColor: 'red',
              }}
              properties={this.subscriberProperties}
            />
            <Button
              onPress={() => {
                this.sendSignal();
              }}
              title="Send Signal"
            />
            {/* <TextInput
              style={{height: 40, borderColor: 'gray', borderWidth: 1}}
              onChangeText={text => {
                this.setState({text});
              }}
              value={this.state.text}
            />
            <Button
              onPress={() => {
                this.sendSignal();
              }}
              title="Send Signal"
            />
            <FlatList
              data={this.state.messages}
              renderItem={this._renderItem}
              keyExtractor={this._keyExtractor}
            />*/}
          </OTSession>
        )}
        {/* {isIOS && DeviceInfo.isEmulator() && (
          <Text
            style={{
              backgroundColor: '#fff',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            CallKeep doesn't work on iOS emulator
          </Text>
        )} */}
      </View>
    );
  }
}

export default App;
