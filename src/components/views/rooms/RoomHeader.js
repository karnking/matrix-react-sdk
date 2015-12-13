/*
Copyright 2015 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

/*
 * State vars:
 * this.state.call_state = the UI state of the call (see CallHandler)
 */

var React = require('react');
var sdk = require('../../../index');
var dis = require("../../../dispatcher");
var CallHandler = require("../../../CallHandler");
var MatrixClientPeg = require('../../../MatrixClientPeg');

module.exports = React.createClass({
    displayName: 'RoomHeader',

    propTypes: {
        room: React.PropTypes.object,
        editing: React.PropTypes.bool,
        onSettingsClick: React.PropTypes.func,
        onSaveClick: React.PropTypes.func,
        onSearchClick: React.PropTypes.func,
        onLeaveClick: React.PropTypes.func,
    },

    getDefaultProps: function() {
        return {
            editing: false,
            onSettingsClick: function() {},
            onSaveClick: function() {},
        };
    },

    componentDidMount: function() {
        this.dispatcherRef = dis.register(this.onAction);
        if (this.props.room) {
            var call = CallHandler.getCallForRoom(this.props.room.roomId);
            var callState = call ? call.call_state : "ended";
            this.setState({
                call_state: callState
            });
        }
    },

    componentWillUnmount: function() {
        dis.unregister(this.dispatcherRef);
    },

    onAction: function(payload) {
        // don't filter out payloads for room IDs other than props.room because
        // we may be interested in the conf 1:1 room
        if (payload.action !== 'call_state' || !payload.room_id) {
            return;
        }
        var call = CallHandler.getCallForRoom(payload.room_id);
        var callState = call ? call.call_state : "ended";
        this.setState({
            call_state: callState
        });
    },

    onVideoClick: function(e) {
        dis.dispatch({
            action: 'place_call',
            type: e.shiftKey ? "screensharing" : "video",
            room_id: this.props.room.roomId
        });
    },
    onVoiceClick: function() {
        dis.dispatch({
            action: 'place_call',
            type: "voice",
            room_id: this.props.room.roomId
        });
    },
    onHangupClick: function() {
        var call = CallHandler.getCallForRoom(this.props.room.roomId);
        if (!call) { return; }
        dis.dispatch({
            action: 'hangup',
            // hangup the call for this room, which may not be the room in props
            // (e.g. conferences which will hangup the 1:1 room instead)
            room_id: call.roomId
        });
    },
    onMuteAudioClick: function() {
        var call = CallHandler.getCallForRoom(this.props.room.roomId);
        if (!call) {
            return;
        }
        var newState = !call.isMicrophoneMuted();
        call.setMicrophoneMuted(newState);
        this.setState({
            audioMuted: newState
        });
    },
    onMuteVideoClick: function() {
        var call = CallHandler.getCallForRoom(this.props.room.roomId);
        if (!call) {
            return;
        }
        var newState = !call.isLocalVideoMuted();
        call.setLocalVideoMuted(newState);
        this.setState({
            videoMuted: newState
        });
    },

    onNameChange: function(new_name) {
        if (this.props.room.name != new_name && new_name) {
            MatrixClientPeg.get().setRoomName(this.props.room.roomId, new_name);
        }
    },

    getRoomName: function() {
        return this.refs.name_edit.value;
    },

    onFullscreenClick: function() {
        dis.dispatch({action: 'video_fullscreen', fullscreen: true}, true);
    },
    
    render: function() {
        var EditableText = sdk.getComponent("elements.EditableText");
        var RoomAvatar = sdk.getComponent('avatars.RoomAvatar');

        var header;
        if (this.props.simpleHeader) {
            header =
                <div className="mx_RoomHeader_wrapper">
                    <div className="mx_RoomHeader_simpleHeader">
                        { this.props.simpleHeader }
                    </div>
                </div>
        }
        else {
            var topic = this.props.room.currentState.getStateEvents('m.room.topic', '');

            var call_buttons;
            if (this.state && this.state.call_state != 'ended') {
                //var muteVideoButton;
                var activeCall = (
                    CallHandler.getCallForRoom(this.props.room.roomId)
                );
/*                
                if (activeCall && activeCall.type === "video") {
                    muteVideoButton = (
                        <div className="mx_RoomHeader_textButton mx_RoomHeader_voipButton"
                                onClick={this.onMuteVideoClick}>
                            {
                                (activeCall.isLocalVideoMuted() ?
                                    "Unmute" : "Mute") + " video"
                            }
                        </div>
                    );
                }
                        {muteVideoButton}
                        <div className="mx_RoomHeader_textButton mx_RoomHeader_voipButton"
                                onClick={this.onMuteAudioClick}>
                            {
                                (activeCall && activeCall.isMicrophoneMuted() ?
                                    "Unmute" : "Mute") + " audio"
                            }
                        </div>
*/                

                call_buttons = (
                    <div className="mx_RoomHeader_textButton"
                            onClick={this.onHangupClick}>
                        End call
                    </div>
                );
            }

            var name = null;
            var searchStatus = null;
            var topic_el = null;
            var cancel_button = null;
            var save_button = null;
            var settings_button = null;
            var actual_name = this.props.room.currentState.getStateEvents('m.room.name', '');
            if (actual_name) actual_name = actual_name.getContent().name;
            if (this.props.editing) {
                name = 
                    <div className="mx_RoomHeader_nameEditing">
                        <input className="mx_RoomHeader_nameInput" type="text" defaultValue={actual_name} placeholder="Name" ref="name_edit"/>
                    </div>
                // if (topic) topic_el = <div className="mx_RoomHeader_topic"><textarea>{ topic.getContent().topic }</textarea></div>
                cancel_button = <div className="mx_RoomHeader_textButton" onClick={this.props.onCancelClick}>Cancel</div>
                save_button = <div className="mx_RoomHeader_textButton" onClick={this.props.onSaveClick}>Save Changes</div>
            } else {
                // <EditableText label={this.props.room.name} initialValue={actual_name} placeHolder="Name" onValueChanged={this.onNameChange} />

                var searchStatus;
                if (this.props.searchInfo && this.props.searchInfo.searchTerm) {
                    searchStatus = <div className="mx_RoomHeader_searchStatus">&nbsp;({ this.props.searchInfo.searchCount } results)</div>;
                }

                name =
                    <div className="mx_RoomHeader_name" onClick={this.props.onSettingsClick}>
                        <div className="mx_RoomHeader_nametext" title={ this.props.room.name }>{ this.props.room.name }</div>
                        { searchStatus }
                        <div className="mx_RoomHeader_settingsButton">
                            <img src="img/settings.svg" width="12" height="12"/>
                        </div>
                    </div>
                if (topic) topic_el = <div className="mx_RoomHeader_topic" title={topic.getContent().topic}>{ topic.getContent().topic }</div>;
            }

            var roomAvatar = null;
            if (this.props.room) {
                roomAvatar = (
                    <RoomAvatar room={this.props.room} width="48" height="48" />
                );
            }

            var zoom_button, video_button, voice_button;
            if (activeCall) {
                if (activeCall.type == "video") {
                    zoom_button = (
                        <div className="mx_RoomHeader_button" onClick={this.onFullscreenClick}>
                            <img src="img/zoom.png" title="Fullscreen" alt="Fullscreen" width="32" height="32" style={{ 'marginTop': '-5px' }}/>
                        </div>
                    );
                }
                video_button = 
                        <div className="mx_RoomHeader_button mx_RoomHeader_video" onClick={activeCall && activeCall.type === "video" ? this.onMuteVideoClick : this.onVideoClick}>
                            <img src="img/video.png" title="Video call" alt="Video call" width="32" height="32" style={{ 'marginTop': '-8px' }}/>
                        </div>;
                var img = "img/voip.png";
                if (activeCall.isMicrophoneMuted()) {
                        img = "img/voip-mute.png";
                }
                voice_button =
                        <div className="mx_RoomHeader_button mx_RoomHeader_voice" onClick={activeCall ? this.onMuteAudioClick : this.onVoiceClick}>
                            <img src={img} title="VoIP call" alt="VoIP call" width="32" height="32" style={{ 'marginTop': '-8px' }}/>
                        </div>;
            }

            var exit_button;
            if (this.props.onLeaveClick) {
                exit_button =
                    <div className="mx_RoomHeader_button mx_RoomHeader_leaveButton">
                        <img src="img/leave.svg" title="Leave room" alt="Leave room" width="26" height="20" onClick={this.props.onLeaveClick}/>
                    </div>;
            }

            header =
                <div className="mx_RoomHeader_wrapper">
                    <div className="mx_RoomHeader_leftRow">
                        <div className="mx_RoomHeader_avatar">
                            { roomAvatar }
                        </div>
                        <div className="mx_RoomHeader_info">
                            { name }
                            { topic_el }
                        </div>
                    </div>
                    {call_buttons}
                    {cancel_button}
                    {save_button}
                    <div className="mx_RoomHeader_rightRow">
                        { video_button }
                        { voice_button }
                        { zoom_button }
                        { exit_button }
                        <div className="mx_RoomHeader_button">
                            <img src="img/search.svg" title="Search" alt="Search" width="21" height="19" onClick={this.props.onSearchClick}/>
                        </div>
                    </div>
                </div>
        }

        return (
            <div className="mx_RoomHeader">
                { header }
            </div>
        );
    },
});
