import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import uuid from 'react-native-uuid';
import Chat from "./Chat";

function Home(): JSX.Element {
    const [roomId, setRoomId] = useState<string>('');
    const [showChat, setShowChat] = useState<boolean>(false);

    const handleSubmit = () => {
        if (roomId !== '') {
            // Enter the room
            setShowChat(true);
        }
    }

    const handleCreateSubmit = () => {
        // Make a new room ID
        const room = uuid.v4() as string;
        console.log(room); // Share this room id to another peer in order to join in the same room
        setRoomId(room);
        setShowChat(true);
    }

    useEffect(() => {
        console.log(showChat)
    }, [showChat]);

    return (
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>P2P WEBRTC</Text>
            <TextInput
                placeholder="Room ID"
                selectionColor="#DDD"
                onChangeText={(text) => setRoomId(text)}
                style={styles.textInput}
            />
            <Pressable style={styles.button}>
                <Text style={styles.text} onPress={handleCreateSubmit}>Create Room</Text>
            </Pressable>
            {showChat && <Text selectable={true}>{`Room Id: ${roomId}`}</Text>}
            <Pressable style={styles.button} onPress={handleSubmit}>
                <Text style={styles.text}>Connect to the Room</Text>
            </Pressable>
            <Text style={styles.textStyle}>Don't have a Room ID? Create One :)</Text>
            {showChat && <Chat roomId={roomId}/>}
        </View>
    );
}

const styles = StyleSheet.create({
    sectionContainer: {
        marginTop: 32,
        paddingHorizontal: 24,
    },
    textStyle: {
        alignSelf: 'center',
        color: 'darkgray',
        marginTop: 5,
    },
    textInput: {
        height: 55,
        paddingLeft: 15,
        paddingRight: 15,
        fontSize: 18,
        backgroundColor: '#fff',
        borderWidth: .5,
    },
    sectionTitle: {
        fontSize: 30,
        fontWeight: '600',
        color: 'black',
        alignSelf: 'center'
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 32,
        marginTop: 15,

        borderRadius: 4,
        elevation: 3,
        backgroundColor: 'black',
    },
    text: {
        fontSize: 16,
        lineHeight: 21,
        fontWeight: 'bold',
        letterSpacing: 0.25,
        color: 'white',
    },
    sectionDescription: {
        marginTop: 8,
        fontSize: 18,
        fontWeight: '400',
    },
    highlight: {
        fontWeight: '700',
    },
});

export default Home;