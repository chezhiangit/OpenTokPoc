/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import {View, Text, PermissionsAndroid, Button} from 'react-native';

// import {
//   Header,
//   LearnMoreLinks,
//   Colors,
//   DebugInstructions,
//   ReloadInstructions,
// } from 'react-native/Libraries/NewAppScreen';

import {OTSession, OTPublisher, OTSubscriber, OT} from 'opentok-react-native';

import uuid from 'uuid';

const SERVER_BASE_URL = 'https://xyzopentokpoc.herokuapp.com';

const options = {
  ios: {
    appName: 'My app name',
  },
  android: {
    alertTitle: 'Permissions required',
    alertDescription: 'This application needs to access your phone accounts',
    cancelButton: 'Cancel',
    okButton: 'ok',
    imageName: 'phone_account_icon',
    additionalPermissions: [PermissionsAndroid.PERMISSIONS.example],
  },
};

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
        // this.showIncomingCall();
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
  }

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
          // alignItems: 'center',
          // justifyContent: 'center',
          // paddingTop: 100,
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
      </View>
    );
  }
}

export default App;
