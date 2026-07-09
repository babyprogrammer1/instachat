import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native'
import React, { useEffect, useState } from 'react'
import type {User as IUser} from '@/types';
import { useRouter } from 'expo-router';
import { dummyUsers } from '@/assets/assets';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '@/assets/styles/SearchScreen.styles';
import { Colors } from '@/constants/Colors';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import Avatar from '@/components/Avatar';


export default function search() {

  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const fetchUsers = async () => {
    setLoading(true);
    setTimeout(() => {
      setUsers(dummyUsers)
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const startChat = async (user: IUser) => {
    router.push(`/chat/${user._id}`)
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
       {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.outlineVariant} />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search by name, email, handle..." placeholderTextColor={Colors.outlineVariant} autoCapitalize='none'/>
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.outlineVariant} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{marginTop: 40}} />
      ) : (
        <FlatList data={users} keyExtractor={(item) => item._id} contentContainerStyle={styles.list} renderItem={({ item: u }) => (
          <TouchableOpacity style={styles.userRow} onPress={() => startChat(u)} activeOpacity={0.7}>
            <Avatar name={u.name} src={u.avatar} size={44} online={u.isOnline} />
            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{u.name}</Text>
                <Text style={styles.userHandle}>@{u.handle}</Text>
              </View>
              <Text style={styles.userEmail} numberOfLines={1}>{u.email}</Text>
            </View>
          </TouchableOpacity>
        )} ListEmptyComponent={<Text style={styles.empty}>{search ? "No users found." : "Search for users by name, email, or handle."}</Text>}/>
      )}

    </SafeAreaView>
  )
}