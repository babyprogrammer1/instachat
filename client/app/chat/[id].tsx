import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, FlatList, Image, TextInput, Alert } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { styles } from '@/assets/styles/ChatScreen.styles'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/Colors'
import { formatTime } from '@/utils/formatTime'
import Avatar from '@/components/Avatar'
import Bubble from '@/components/Bubble'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { api, useApp } from '@/context/AppContext'


export default function ChatScreen() {

  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { auth, messages, setMessages, users, conversations, selectedConversation, setSelectedConversation, typingUsers, sendWsEvent } = useApp()

  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mediaUri, setMediaUri] = useState<string | null>(null)

  const flatListRef = useRef<FlatList>(null);

  const conversation = selectedConversation?._id === id
    ? selectedConversation
    : conversations.find((item) => item._id === id) || null;
  const partner = conversation?.participant;

  //Scroll to bottom when new message is added
  useEffect(() => {
    if (!id) return;
    const loadChat = async () => {
      setLoading(true);
      try {
        const [conversationResponse, messagesResponse] = await Promise.all([
          conversation ? Promise.resolve({ data: { conversation } }) : api.get(`/api/messages/conversations`),
          api.get(`/api/messages/conversations/${id}/messages`),
        ]);
        if (!conversation && conversationResponse.data.success) {
          const found = conversationResponse.data.conversations.find((item: typeof conversations[number]) => item._id === id);
          setSelectedConversation(found || null);
        }
        if (messagesResponse.data.success) setMessages(messagesResponse.data.messages);
      } catch (error) {
        console.error("Unable to load conversation:", error);
      } finally {
        setLoading(false);
      }
    };
    loadChat();
  }, [id]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const deleteChat = () => {
    Alert.alert("Delete conversation", "Delete this conversation and all its messages?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await api.delete(`/api/messages/conversations/${id}`);
          setSelectedConversation(null);
          router.back();
        } catch (error) {
          console.error("Unable to delete conversation:", error);
          Alert.alert("Delete failed", "Unable to delete this conversation right now.");
        }
      }},
    ]);
  }

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission needed","Allow access to your photos to change your avatar.");
          return;
        }
    
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images", "videos"],
          quality: 0.8
        });

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          setMediaUri(asset.uri);
        }
  };

  const handleTyping = (inputText: string) => {
    setText(inputText);
    if (conversation && partner) {
      sendWsEvent({ type: "typing", conversationId: conversation._id, receiverId: partner._id, isTyping: inputText.length > 0 });
    }
  }

  const send = async () => {
    if ((!text.trim() && !mediaUri) || !conversation || !auth.user) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("conversationId", conversation._id);
      formData.append("receiverId", partner?._id || "");
      formData.append("text", text.trim());
      if (mediaUri) {
        formData.append("file", {
          uri: mediaUri,
          type: "image/jpeg",
          name: "message.jpg",
        } as any);
      }
      const { data } = await api.post("/api/messages/send", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        sendWsEvent({
          type: "message",
          conversationId: conversation._id,
          receiverId: partner?._id,
          payload: data.message,
        });
      }
      sendWsEvent({ type: "typing", conversationId: conversation._id, receiverId: partner?._id, isTyping: false });
    } catch (error) {
      console.error("Unable to send message:", error);
      Alert.alert("Send failed", "Unable to send your message right now.");
    } finally {
      setSending(false);
      setText('');
      setMediaUri(null);
    }
  }

  // Typing indicator helpers
  const typingEntries = Object.entries(typingUsers).filter(([userId, isTyping]) => {
    if (!isTyping || userId === auth.user?._id) return false;
    return partner?._id === userId;
  });

  if (!conversation || !partner) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons  name='chevron-back' size={24} color={Colors.onSurface}/>
        </TouchableOpacity>
        <View style={styles.emptyState}>
          <Ionicons  name='chatbubbles-outline' size={52} color={Colors.outlineVariant}/>
          <Text style={styles.emptyText}>Conversation not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  const headerName = partner.name;
  const headerAvatar = partner.avatar;
  const headerSub = partner.isOnline ? 'Online' : partner.lastSeen ? `Last seen ${formatTime(partner.lastSeen)}` : 'Offline';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons  name='chevron-back' size={24} color={Colors.onSurface}/>
        </TouchableOpacity>
        <Avatar name={headerName} src={headerAvatar} size={38} online={partner?.isOnline} />
        <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {headerName}
              <Text style={styles.headerHandle}>@{partner?.handle}</Text>
            </Text>
            <Text style={[styles.headerSub, partner?.isOnline && { color: Colors.online }]}>{headerSub}</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.backBtn} >
            <Ionicons  name='call-outline' size={20} color={Colors.onSurfaceVariant}/>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn}>
            <Ionicons  name='videocam-outline' size={20} color={Colors.onSurfaceVariant}/>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={deleteChat}>
            <Ionicons name='trash-outline' size={20} color={Colors.onSurfaceVariant}/>
          </TouchableOpacity>
        </View>
      </View>
      {/* Main */}
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {/* Messages */}
      {loading ? (
        <ActivityIndicator style={{ flex:1 }} color={Colors.primary} />
      ) : (
        <FlatList data={messages} 
        ref={flatListRef}
        renderItem={({ item: msg, index }) => {
          const isMine = msg.sender === auth.user?._id;
          const prev = messages[index - 1];
          const showGap  = !prev || prev.sender !== msg.sender;
          return (
            <View style={showGap && index > 0 ? { marginTop: 10 } : {}}>
              <Bubble msg={msg} isMine={isMine} />
            </View>
          )
        }} 
        keyExtractor={(item) => item._id} 
        contentContainerStyle={styles.messageList} 
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}/>
      )}
      {/* Typing Indicator */}
      {typingEntries.length > 0 && (
        <View style={styles.typingRow}>
          {typingEntries.map(([userId]) => {
            const user = users.find(u => u._id === userId) || partner;
            return (
              <Text key={userId} style={styles.typingText}>
                {user?.name || 'Someone'} is typing...
              </Text>
            );
          })}
        </View>
      )}
      {/* Input */}
      <View style={styles.inputBar}>
        {/* Media preview */}
        {mediaUri && (
          <View style={styles.mediaPreview}>
            <Image source={{ uri: mediaUri }} style={styles.mediaThumb}/>
            <TouchableOpacity style={styles.mediaRemove} onPress={() => setMediaUri(null)}>
              <Ionicons name='close-circle' size={20} color='#fff' />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.attachBtn} onPress= {pickMedia}>
            <Ionicons name='image-outline' size={22} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Message..."
            value={text}
            onChangeText={handleTyping}
            placeholderTextColor={Colors.outlineVariant}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={!text.trim() && !mediaUri || sending} activeOpacity={0.85}>
            <LinearGradient colors={[Colors.primary, Colors.primaryContainer]} start={{x: 0, y:0}} end={{x: 1, y:1}} style={[styles.sendBtn, !text.trim() && !mediaUri && styles.sendBtnDisabled]}>
              {sending ? (
                <ActivityIndicator color='#fff' size="small" />
              ) : (
                <Ionicons name='send' size={16} color='#fff' />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}