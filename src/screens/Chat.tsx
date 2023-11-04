import React, {useEffect, useRef, useState} from 'react';
import {Button, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View} from "react-native";
import {connect, Socket} from "socket.io-client";
import {RTCIceCandidate, RTCPeerConnection, RTCSessionDescription} from "react-native-webrtc";
import RTCIceCandidateEvent from "react-native-webrtc/lib/typescript/RTCIceCandidateEvent";
import RTCDataChannel from "react-native-webrtc/lib/typescript/RTCDataChannel";
import MessageEvent from "react-native-webrtc/lib/typescript/MessageEvent";
import uuid from "react-native-uuid";

type ChatProps = {
    roomId: string
}

type Message = {
    from: string,
    value: string
}

const Chat = (route: ChatProps) => {
    const otherUser = useRef<string>();
    const socketRef = useRef<Socket>();
    const peerRef = useRef<RTCPeerConnection>();
    const sendChannel = useRef<RTCDataChannel>();
    //const [messages, setMessages] = useState<IMessage[]>([]);
    const [textToSend, setTextToSend] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const roomId = route.roomId;

    let sessionConstraints = {
        mandatory: {
            OfferToReceiveAudio: false,
            OfferToReceiveVideo: false,
            VoiceActivityDetection: false
        }
    };

    useEffect(() => {
        console.log(`[INFO] Room id: ${roomId}`);

        // Step 1: Connect to the signal server
        socketRef.current = connect("http://192.168.1.114:5000/");

        // Step 2: if initiator we will create a room otherwise join it
        socketRef.current?.emit("join room", roomId);

        // Step 3: waiting other connections
        socketRef.current?.on('other user', userId => {
            console.log("[INFO] {other user} event");
            callUser(userId);
            otherUser.current = userId;
        })

        // Step 4: signal that new user joined
        socketRef.current?.on('user joined', userId => {
            console.log("[INFO] {user joined} event");
            otherUser.current = userId;
        })

        // Signals that booth peers have joined the room
        // socketRef.current?.on('user joined', userId => {
        //     otherUser.current = userId;
        // })

        socketRef.current?.on("offer", handleOffer);

        socketRef.current?.on("answer", handleAnswer);

        socketRef.current?.on("ice-candidate", handleNewICECandidateMsg);
    }, []);

    function callUser(userId: string) {
        console.log('[INFO] Call a user');
        peerRef.current = Peer(userId);
        sendChannel.current = peerRef.current?.createDataChannel("sendChannel");
        sendChannel.current?.addEventListener('message', handleReceiveMessage);
        sendChannel.current?.addEventListener('close', () => {
            console.log('Remote channel closed!');
        })
    }

    function Peer(userId: string) {
        console.log("[INFO] Create Peer");
        const peer = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.stunprotocol.org"
                },
                {
                    urls: 'turn:numb.viagenie.ca',
                    credential: 'muazkh',
                    username: 'webrtc@live.com'
                },
            ]
        })
        peer.addEventListener('icecandidate', handleICECandidateEvent);
        peer.addEventListener('negotiationneeded', () => handleNegotiationNeededEvent(userId));
        return peer;
    }

    function handleICECandidateEvent(e: RTCIceCandidateEvent<"icecandidate">) {
        try {
            if (e.candidate) {
                console.log("[INFO] handleICECandidateEvent");
                console.log("[INFO] e.candidate: ", e.candidate);
                const payload = {
                    target: otherUser.current,
                    candidate: {...e.candidate}
                }
                socketRef.current?.emit('ice-candidate', payload);
            }

        } catch (e) {
            console.log('[ERROR] ', e);
        }
    }

    function handleNegotiationNeededEvent(userId: string) {
        console.log("[INFO] handleNegotiationNeededEvent");
        peerRef.current?.createOffer({})
            .then(offer => {
                return peerRef.current?.setLocalDescription(offer);
            })
            .then(() => {
                const payload = {
                    target: userId,
                    caller: socketRef.current?.id,
                    sdp: peerRef.current?.localDescription
                }
                socketRef.current?.emit("offer", payload);
            })
            .catch(err => console.log("Error handling negotiation needed event", err));
    }

    function handleReceiveMessage(e: MessageEvent<"message">) {
        console.log("[INFO] Message received from peer", e.data);
        const msg = [{
            _id: Number(uuid.v4() as string),
            text: e.data as string,
            createdAt: new Date(),
            user: {
                _id: 2,
            }
        }];

        setMessages(messages => [...messages, {from: 'User', value: e.data.toString()}]);
    }

    function handleOffer(incoming: any) {
        console.log('[INFO] Handling offer')
        peerRef.current = Peer(null!);
        peerRef.current?.addEventListener('datachannel', (e) => {
            sendChannel.current = e.channel;
            sendChannel.current?.addEventListener('message', handleReceiveMessage);
        })

        const desc = new RTCSessionDescription(incoming.sdp);

        peerRef.current?.setRemoteDescription(desc).then(() => {
        }).then(() => {
            console.log('[INFO] Create Answer');
            return peerRef.current?.createAnswer();
        }).then(answer => {
            return peerRef.current?.setLocalDescription(answer);
        }).then(() => {
            const payload = {
                target: incoming.caller,
                caller: socketRef.current?.id,
                sdp: peerRef.current?.localDescription
            }
            console.log('[INFO] Send Answer emit')
            socketRef.current?.emit("answer", payload);
        })
    }

    function handleAnswer(message: any) {
        console.log('[INFO] Handle Answer');
        const desc = new RTCSessionDescription(message.sdp);
        peerRef.current?.setRemoteDescription(desc).catch(e => console.log("Error handle answer", e));
    }

    function handleNewICECandidateMsg(incoming: any) {
        console.log('[INFO] handleNewICECandidateMsg');
        const candidate = new RTCIceCandidate(incoming);

        peerRef.current?.addIceCandidate(candidate)
            .catch(e => console.log(e));
    }

    function sendMessage(message: string) {
        console.log('[INFO] Send Message');
        sendChannel.current?.send(message);
        setMessages(messages => [...messages, {from: 'User', value: message }])
        setTextToSend('');
    }

    return (
        <SafeAreaView style={styles.sectionContainer}>
            <ScrollView contentInsetAdjustmentBehavior="automatic">
                <TextInput placeholder={'Your message...'} onChangeText={text => setTextToSend(text)}/>
                <Button title={"Send"} onPress={() => sendMessage(textToSend)}/>
                {messages.map(message => {
                    return (
                        <View key={uuid.v4().toString()}>
                            <Text style={styles.messageUserName}>{message.from}: </Text>
                            <Text>{message.value}</Text>
                        </View>
                    )
                })}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    sectionContainer: {
        marginTop: 32,
        paddingHorizontal: 24,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        alignContent: 'center',
    },
    messageUserName: {
        fontFamily: "sans-serif",
        fontSize: 20,
        color: 'green'
    },
    substring: {
        fontFamily: "sans-serif",
        fontSize: 14,
        color: 'gray',
        alignSelf: "flex-end",
    },
    textHeader: {
        fontFamily: "sans-serif",
        fontSize: 22,
        alignSelf: "center",
        marginTop: 20,
    }
})

export default Chat;