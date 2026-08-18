/**
 * P5-07 — Retailer Self-Registration + OTP
 * Multi-step: Business details → OTP → immediate access
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight, Store } from 'lucide-react-native';
import api from '../../services/api';
import { setCredentials } from '../../store/slices/authSlice';
import { useAppDispatch } from '../../hooks/useRedux';
import { Button, Input } from '../../components';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';

interface Props { navigation: NativeStackNavigationProp<any> }

interface FormData {
  name: string;
  email: string;
  mobile: string;
  password: string;
  address: string;
}

const steps = [
  { label: 'Customer Details', active: true },
  { label: 'OTP Verification', active: false },
  { label: 'Access Granted', active: false },
];

const RetailerRegisterScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const [form, setForm] = useState<FormData>({
    name: '', email: '', mobile: '', password: '', address: '',
  });
  const [loading, setLoading] = useState(false);

  const update = (key: keyof FormData, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleRegister = async () => {
    if (!form.name || !form.mobile || form.mobile.length < 10) {
      Alert.alert('Error', 'Please enter your name and 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/retailer/auth/register', {
        owner_name: form.name,
        business_name: form.name,
        email: form.email,
        mobile: `+91${form.mobile}`,
        password: form.password,
        address: form.address,
      });

      const { access_token, refresh_token, user } = res.data;
      dispatch(setCredentials({
        accessToken: access_token,
        refreshToken: refresh_token,
        user: { ...user, role: 'retailer' },
      }));
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Store size={18} color={Colors.primaryDark} />
          </View>
          <Text style={styles.heroTitle}>Customer Registration</Text>
          <Text style={styles.heroSubtitle}>Create your customer account to browse catalog, place orders, and manage your account.</Text>
        </View>

        <Text style={styles.sectionTitle}>Customer Details</Text>

        <View style={styles.formCard}>
          <Input label="Full Name *" value={form.name} onChangeText={t => update('name', t)} placeholder="Rajesh Kumar" containerStyle={styles.field} />
          <Input label="Email Address" value={form.email} onChangeText={t => update('email', t)} keyboardType="email-address" autoCapitalize="none" placeholder="rajesh@example.com" containerStyle={styles.field} />
          <View style={styles.field}>
            <Text style={styles.inputLabel}>Mobile Number *</Text>
            <View style={styles.phoneRow}>
              <View style={styles.prefix}><Text style={styles.prefixText}>+91</Text></View>
              <Input
                value={form.mobile}
                onChangeText={t => update('mobile', t.replace(/\D/g, '').slice(0, 10))}
                keyboardType="number-pad"
                placeholder="9876543210"
                style={styles.phoneInput}
                containerStyle={{ marginBottom: 0, flex: 1 }}
              />
            </View>
          </View>
          <Input label="Password *" value={form.password} onChangeText={t => update('password', t)} secureTextEntry placeholder="••••••••" containerStyle={styles.field} />
          <Input label="Address" value={form.address} onChangeText={t => update('address', t)} multiline placeholder="Enter your full address..." containerStyle={styles.field} />
          <Button
            label="Create Account & Start Shopping"
            onPress={handleRegister}
            loading={loading}
            icon={<ArrowRight size={18} color={Colors.white} />}
            style={styles.ctaButton}
          />
          <Text style={styles.disclaimer}>By continuing, you agree to our Terms of Service and Privacy Policy.</Text>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('VendorLogin', { role: 'retailer' })} activeOpacity={0.7}>
          <Text style={styles.signInText}>Already registered? Sign In</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxxl },
  back: { color: Colors.primary, fontWeight: '700', marginBottom: Spacing.md, fontSize: Typography.base },
  heroCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.card,
  },
  heroBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  heroTitle: { fontSize: Typography.subheading, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xs },
  heroSubtitle: { fontSize: Typography.base, color: Colors.textSecondary, lineHeight: 22 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xl, position: 'relative' },
  stepperLine: { position: 'absolute', top: 16, left: Spacing.md, right: Spacing.md, height: 1, backgroundColor: Colors.border },
  stepItem: { flex: 1, alignItems: 'center' },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepNumber: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textMuted },
  stepNumberActive: { color: Colors.white },
  stepText: { fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'center' },
  stepTextActive: { color: Colors.textPrimary, fontWeight: '700' },
  sectionTitle: { fontSize: Typography.heading, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.md },
  formCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  field: { marginBottom: Spacing.md },
  inputLabel: { fontSize: Typography.label, color: Colors.textSecondary, fontWeight: '700', marginBottom: Spacing.xs },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  prefix: {
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  prefixText: { fontSize: Typography.base, fontWeight: '700', color: Colors.textPrimary },
  phoneInput: { flex: 1, marginBottom: 0 },
  ctaButton: { marginTop: Spacing.sm },
  disclaimer: { fontSize: Typography.caption, color: Colors.textMuted, marginTop: Spacing.sm, textAlign: 'center', lineHeight: 18 },
  otpIntro: { fontSize: Typography.base, color: Colors.textSecondary, marginBottom: Spacing.md },
  resend: { textAlign: 'center', color: Colors.primary, fontWeight: '700', marginTop: Spacing.md, fontSize: Typography.sm },
  resendDisabled: { opacity: 0.5 },
  signInText: { color: Colors.secondary, fontWeight: '700', fontSize: Typography.sm, marginTop: Spacing.md, textAlign: 'center' },
});

export default RetailerRegisterScreen;
