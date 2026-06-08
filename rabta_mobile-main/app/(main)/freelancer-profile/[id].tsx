import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { Image } from 'expo-image';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import axiosInstance from '../../../src/api/axiosInstance';
import { useTheme } from '../../../src/theme/ThemeContext';
import { typography } from '../../../src/theme/typography';
import Button from '../../../src/components/ui/Button';
import { RootState } from '../../../src/store/store';
import { updateProfile } from '../../../src/store/slices/authSlice';
import { useAppDispatch } from '../../../src/store/hooks';

interface Freelancer {
  _id: string;
  fullName: string;
  jobTitle?: string;
  bioHeadline?: string;
  aboutMe?: string;
  location?: string;
  email?: string;
  phoneNumber?: string;
  avatar?: string;
  skills?: string[];
  links?: { platform: string; url: string; _id?: string }[];
  featuredProjects?: { title: string; description: string; projectLink?: string; githubLink?: string; _id?: string }[];
}

export default function FreelancerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const dispatch = useAppDispatch();
  
  const currentUser = useSelector((s: RootState) => s.auth.user);
  
  const [freelancer, setFreelancer] = useState<Freelancer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchFreelancer = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axiosInstance.get(`/users/${id}`);
        setFreelancer(response.data.data.user);
      } catch (err: any) {
        console.error('Error fetching freelancer:', err);
        setError(err.response?.data?.message || 'Failed to load freelancer profile');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchFreelancer();
    }
  }, [id]);

  const handleToggleSave = async () => {
    if (!currentUser || !id) return;
    
    try {
      setSaving(true);
      const response = await axiosInstance.post(`/users/toggle-save-freelancer/${id}`);
      const updatedUser = response.data.data.user;
      
      dispatch(updateProfile(updatedUser));
      
      const isSaved = updatedUser.savedFreelancers?.includes(id);
      Toast.show({
        type: 'success',
        text1: isSaved ? 'Freelancer Saved' : 'Freelancer Removed',
        text2: isSaved ? 'Added to your saved freelancers.' : 'Removed from your saved freelancers.',
      });
    } catch (err: any) {
      console.error('Error toggling save freelancer:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.response?.data?.message || 'Failed to update saved status',
      });
    } finally {
      setSaving(false);
    }
  };

  const isEmployer = currentUser?.role === 'employer';
  const isSaved = currentUser?.savedFreelancers?.includes(id as string);

  const renderHeaderRight = () => {
    if (!isEmployer) return null;
    
    return (
      <TouchableOpacity 
        onPress={handleToggleSave} 
        disabled={saving}
        style={{ marginRight: 15 }}
      >
        <Ionicons 
          name={isSaved ? "bookmark" : "bookmark-outline"} 
          size={24} 
          color={colors.purple} 
        />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <Stack.Screen options={{ title: 'Loading...', headerRight: () => null }} />
        <ActivityIndicator size="large" color={colors.purple} />
      </View>
    );
  }

  if (error || !freelancer) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <Stack.Screen options={{ title: 'Error', headerRight: () => null }} />
        <Text style={[typography.body, { color: colors.textMuted, marginBottom: 20 }]}>
          {error || 'Freelancer not found'}
        </Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const renderSocialIcon = (platform: string) => {
    const platformLower = platform.toLowerCase();
    if (platformLower.includes('github')) return <Ionicons name="logo-github" size={24} color={colors.text} />;
    if (platformLower.includes('linkedin')) return <Ionicons name="logo-linkedin" size={24} color={colors.text} />;
    if (platformLower.includes('twitter') || platformLower.includes('x')) return <Ionicons name="logo-twitter" size={24} color={colors.text} />;
    if (platformLower.includes('behance')) return <Ionicons name="logo-behance" size={24} color={colors.text} />;
    if (platformLower.includes('dribbble')) return <Ionicons name="logo-dribbble" size={24} color={colors.text} />;
    return <Ionicons name="link-outline" size={24} color={colors.text} />;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen 
        options={{ 
          title: freelancer.fullName || 'Freelancer Profile',
          headerBackTitleVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingLeft: 8 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: renderHeaderRight,
        }} 
      />
      
      {/* Profile Header */}
      <View style={styles.header}>
        {freelancer.avatar && freelancer.avatar.length > 0 ? (
          <Image 
            source={{ uri: freelancer.avatar }} 
            style={styles.avatar} 
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
            <Text style={[typography.h2, { color: colors.text }]}>
              {getInitials(freelancer.fullName)}
            </Text>
          </View>
        )}
        <Text style={[typography.h3, styles.name, { color: colors.text }]}>
          {freelancer.fullName}
        </Text>
        {freelancer.jobTitle && (
          <Text style={[typography.body, styles.jobTitle, { color: colors.textSubtle }]}>
            {freelancer.jobTitle}
          </Text>
        )}
        <TouchableOpacity
          onPress={() => router.push({
            pathname: '/(main)/ChatWindowScreen',
            params: { userId: freelancer._id, name: freelancer.fullName, avatar: freelancer.avatar }
          } as any)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: colors.purple,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
            marginTop: 16,
            width: '100%',
          }}
        >
          <MaterialIcons name="chat" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Send Message</Text>
        </TouchableOpacity>
      </View>

      {/* Social Links */}
      {freelancer.links && freelancer.links.length > 0 && (
        <View style={styles.linksContainer}>
          {freelancer.links.map((link, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.linkIcon, { backgroundColor: colors.surface }]}
              onPress={() => link.url && Linking.openURL(link.url)}
            >
              {renderSocialIcon(link.platform)}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* About Me */}
      <View style={styles.section}>
        <Text style={[typography.h4, styles.sectionTitle, { color: colors.text }]}>About Me</Text>
        <Text style={[typography.body, { color: colors.textSubtle, lineHeight: 24 }]}>
          {freelancer.aboutMe || freelancer.bioHeadline || 'No description provided yet.'}
        </Text>
      </View>

      {/* Technical Skills */}
      <View style={styles.section}>
        <Text style={[typography.h4, styles.sectionTitle, { color: colors.text }]}>Technical Skills</Text>
        {freelancer.skills && freelancer.skills.length > 0 ? (
          <View style={styles.skillsContainer}>
            {freelancer.skills.map((skill, index) => (
              <View key={index} style={[styles.skillBadge, { backgroundColor: colors.purpleSoft }]}>
                <Text style={[typography.caption, { color: colors.purple }]}>{skill}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[typography.body, { color: colors.textMuted, fontStyle: 'italic' }]}>No skills listed yet.</Text>
        )}
      </View>

      {/* Contact Info */}
      {(freelancer.email || freelancer.phoneNumber) && (
        <View style={styles.section}>
          <Text style={[typography.h4, styles.sectionTitle, { color: colors.text }]}>Contact</Text>
          {freelancer.email && (
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${freelancer.email}`)}>
              <Text style={[typography.body, { color: colors.purple, marginBottom: 8 }]}>✉ {freelancer.email}</Text>
            </TouchableOpacity>
          )}
          {freelancer.phoneNumber && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${freelancer.phoneNumber}`)}>
              <Text style={[typography.body, { color: colors.purple }]}>📞 {freelancer.phoneNumber}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Featured Projects */}
      <View style={styles.section}>
        <Text style={[typography.h4, styles.sectionTitle, { color: colors.text }]}>Featured Projects</Text>
        {freelancer.featuredProjects && freelancer.featuredProjects.length > 0 ? (
          freelancer.featuredProjects.map((project, index) => (
            <View key={project._id || index} style={[styles.projectCard, { backgroundColor: colors.surface }]}>
              <Text style={[typography.subtitle1, { color: colors.text, marginBottom: 8 }]}>
                {project.title}
              </Text>
              <Text style={[typography.body2, { color: colors.textSubtle, marginBottom: 16 }]}>
                {project.description}
              </Text>
              <View style={styles.projectActions}>
                {project.projectLink && (
                  <TouchableOpacity 
                    style={[styles.projectBtn, { backgroundColor: colors.purple }]}
                    onPress={() => Linking.openURL(project.projectLink!)}
                  >
                    <Ionicons name="eye-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={[typography.button, { color: '#fff' }]}>View</Text>
                  </TouchableOpacity>
                )}
                {project.githubLink && (
                  <TouchableOpacity 
                    style={[styles.projectBtn, { backgroundColor: colors.text, marginLeft: project.projectLink ? 10 : 0 }]}
                    onPress={() => Linking.openURL(project.githubLink!)}
                  >
                    <Ionicons name="logo-github" size={16} color={colors.bg} style={{ marginRight: 4 }} />
                    <Text style={[typography.button, { color: colors.bg }]}>GitHub</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        ) : (
          <Text style={[typography.body, { color: colors.textMuted, fontStyle: 'italic' }]}>No projects added yet.</Text>
        )}
      </View>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    marginBottom: 4,
    textAlign: 'center',
  },
  jobTitle: {
    textAlign: 'center',
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  projectCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  projectActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
