import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Pressable } from 'react-native'
import React, { useState } from 'react'
import { dummyUserProfile } from '@/assets/assets'
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '@/assets/styles/ProfileScreen.styles';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Avatar from '@/components/Avatar';
import { TextInput } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker'

export default function profile() {
  const {auth} = {auth: {user: dummyUserProfile}}

  const user = auth.user;
  const [editMode, setEditMode] = useState(false);
  const [profileName, setProfileName] = useState(auth.user?.name || "");
  const [profileHandle, setProfileHandle] = useState(auth.user?.handle || "");
  const [profileBio, setProfileBio] = useState(auth.user?.bio || "");
  const [avatarUri, setAvatarUri] = useState<(string | null)>(  null);
  const [loading, setLoading] = useState(false);

  const displayAvatar = avatarUri || user?.avatar;

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission needed","Allow access to your photos to change your avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    }); 
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  const saveProfile = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setEditMode(false);
      setAvatarUri(null);
    }, 2000);
  }

  const cancelEdit = () => {
    setEditMode(false)
    setProfileName(user?.name || "")
    setProfileHandle(user?.handle || "")
    setProfileBio(user?.bio || "")
    setAvatarUri(null)
  }

  const handleLogout = async () => {
    setShowLogout(true)
  }

  const [showLogout, setShowLogout] = useState(false)

  const confirmSignOut = () => {
    setShowLogout(false)
    // TODO: perform sign out logic here
    
  }
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          {!editMode && (
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(true)}>
              <Ionicons name="pencil" size={16} color={Colors.primary} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={editMode ? pickAvatar : undefined} activeOpacity={editMode ? 0.7 : 1}>
            <View style={styles.avatarWrapper}>
              <Avatar name={user?.name || "?"} src={displayAvatar} size={100} />
              {editMode && (
                <View style={styles.cameraOverlay}>
                  <Ionicons name="camera" size={22} color='#fff' />
                </View>
              )}
            </View>
          </TouchableOpacity>

          {!editMode && (
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || "User"}</Text>
              <Text style={styles.userHandle}>@{user?.handle || "user"}</Text>
              <Text style={styles.userEmail}>@{user?.email || "user@example.com"}</Text>
              {user?.bio && (
                <Text style={styles.userBio}>{user?.bio}</Text>
              )}
            </View>
          )}
        </View>
        {/* Edit form */}
        {editMode && (
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput style={styles.input} value={profileName} onChangeText={setProfileName} placeholder="Enter your name" placeholderTextColor={Colors.outlineVariant} autoCapitalize='words' />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Handle</Text>
              <View style={styles.handleRow}>
                <Text style={styles.atSign}>@</Text>
                <TextInput style={[styles.input, styles.handleInput]} value={profileHandle} onChangeText={(v) => setProfileHandle(v.toLowerCase().replace(/\s/g, ''))} placeholder="Enter your handle" placeholderTextColor={Colors.outlineVariant} autoCapitalize='none' />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Bio</Text>
              <TextInput style={[styles.input, styles.bioInput]} value={profileBio} onChangeText={setProfileBio} placeholder="Tell us about yourself" placeholderTextColor={Colors.outlineVariant} multiline numberOfLines={3}/>
            </View>
            <TouchableOpacity style={styles.saveWrapper} onPress={saveProfile} disabled={loading} activeOpacity={0.88}>
              <LinearGradient colors={[Colors.primary, Colors.primaryContainer]} start={{x: 0, y:0}} end={{x: 1, y:1}} style={styles.saveBtn}>
                {loading ? (
                  <ActivityIndicator color={Colors.onPrimary} />) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit} disabled={loading}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Profile Options */}
        {!editMode && (
          <View style={styles.optionsSection}>
            <TouchableOpacity style={styles.optionRow} onPress={() => {}}>
              <View style={styles.optionIcon}>
                <Ionicons name="settings-outline" size={20} color={Colors.onSurfaceVariant} />
              </View>
              <Text style={styles.optionText}>Settings</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.outlineVariant} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow} onPress={() => {}}>
              <View style={styles.optionIcon}>
                <Ionicons name="notifications-outline" size={20} color={Colors.onSurfaceVariant} />
              </View>
              <Text style={styles.optionText}>Notification</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.outlineVariant} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow} onPress={() => {}}>
              <View style={styles.optionIcon}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.onSurfaceVariant} />
              </View>
              <Text style={styles.optionText}>Privacy & Security</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.outlineVariant} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow} onPress={() => {}}>
              <View style={styles.optionIcon}>
                <Ionicons name="help-circle-outline" size={20} color={Colors.onSurfaceVariant} />
              </View>
              <Text style={styles.optionText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.outlineVariant} />
            </TouchableOpacity>

          </View>
        )}
        {/* Sign out */}

        <View style={styles.signOutSection}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={Colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        transparent
        visible={showLogout}
        animationType="fade"
        onRequestClose={() => setShowLogout(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }}
          onPress={() => setShowLogout(false)}
        >
          <Pressable
            style={{ backgroundColor: '#fff', borderRadius: 18, padding: 20, gap: 14 }}
            onPress={() => {}}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.onSurface }}>Sign out?</Text>
            <Text style={{ fontSize: 14, color: Colors.onSurfaceVariant }}>
              Are you sure you want to sign out of your account?
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowLogout(false)}
                style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: Colors.surface }}
              >
                <Text style={{ color: Colors.onSurface }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmSignOut}
                style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: Colors.error }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}