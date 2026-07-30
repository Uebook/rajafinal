/**
 * P5-14 — Checkout Screen + P5-15 Payment (Razorpay stub)
 * Address input, coupon, order summary, Place Order CTA.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { clearCart } from '../../store/slices/cartSlice';
import { Button, Input, Card } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { formatINR, calcCartTotals } from '../../utils/helpers';
import { Config } from '../../config';
import RazorpayCheckout from 'react-native-razorpay';
import { ArrowLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INDIAN_STATES = [
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'AR', name: 'Arunachal Pradesh' },
  { code: 'AS', name: 'Assam' },
  { code: 'BR', name: 'Bihar' },
  { code: 'CG', name: 'Chhattisgarh' },
  { code: 'GA', name: 'Goa' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'HR', name: 'Haryana' },
  { code: 'HP', name: 'Himachal Pradesh' },
  { code: 'JK', name: 'Jammu & Kashmir' },
  { code: 'JH', name: 'Jharkhand' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'KL', name: 'Kerala' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'MN', name: 'Manipur' },
  { code: 'ML', name: 'Meghalaya' },
  { code: 'MZ', name: 'Mizoram' },
  { code: 'NL', name: 'Nagaland' },
  { code: 'OD', name: 'Odisha' },
  { code: 'PB', name: 'Punjab' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'SK', name: 'Sikkim' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'TS', name: 'Telangana' },
  { code: 'TR', name: 'Tripura' },
  { code: 'UK', name: 'Uttarakhand' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'WB', name: 'West Bengal' },
  { code: 'AN', name: 'Andaman & Nicobar' },
  { code: 'CH', name: 'Chandigarh' },
  { code: 'DN', name: 'Dadra & Nagar Haveli' },
  { code: 'DD', name: 'Daman & Diu' },
  { code: 'DL', name: 'Delhi' },
  { code: 'LD', name: 'Lakshadweep' },
  { code: 'PY', name: 'Puducherry' }
];

const CheckoutScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(s => s.cart.items);
  const user = useAppSelector(s => s.auth.user);
  const [address, setAddress] = useState({ line1: '', city: '', state: '', pincode: '' });
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const { subtotal, gst, grandTotal } = calcCartTotals(cartItems);

  // Load saved address and available coupons on mount
  useEffect(() => {
    const initData = async () => {
      try {
        const savedAddr = await AsyncStorage.getItem('saved_delivery_address');
        if (savedAddr) {
          setAddress(JSON.parse(savedAddr));
        }
      } catch (e) {
        console.error('Failed to load address', e);
      }

      try {
        const { data } = await api.get('/discounts');
        setAvailableCoupons(data || []);
      } catch (e) {
        console.error('Failed to load coupons', e);
      }
    };
    initData();
  }, []);

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    try {
      const { data } = await api.post('/cart/apply-coupon', { code: coupon.trim() });
      setDiscount(data.discount_amount || 0);
      Alert.alert('Coupon Applied', `Discount: ${formatINR(data.discount_amount)}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Could not apply coupon';
      Alert.alert('Invalid Coupon', msg);
    }
  };

  const placeOrder = async () => {
    if (!address.line1 || !address.city || !address.state || !address.pincode) {
      Alert.alert('Error', 'Please fill all address fields');
      return;
    }
    setPlacing(true);
    try {
      // Auto-save address for next time
      await AsyncStorage.setItem('saved_delivery_address', JSON.stringify(address));

      // 1. Format address object into string format expected by backend schema
      const addressStr = `${address.line1}, ${address.city}, ${address.state} - ${address.pincode}`;

      // 2. Place Order (Atomic creation on backend)
      const { data: orderData } = await api.post('/orders', {
        delivery_address: addressStr,
        discount_code: coupon || undefined,
      });

      // 3. Initiate payment gateway transaction on backend
      const { data: paymentData } = await api.post('/payments/initiate', {
        order_id: orderData.id,
      });

      // 4. Verify mock payment instantly to confirm order on backend
      await api.post('/payments/verify', {
        razorpay_order_id: paymentData.gateway_order_id,
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_signature: 'sig_mock_bypass_razorpay',
      });

      // 5. Clear cart and redirect on success
      dispatch(clearCart());
      navigation.replace('OrderConfirmation', { order: orderData });
    } catch (err: any) {
      const detail = err.response?.data?.message || err.response?.data?.detail || err.message || '';
      // P5-19 — Credit limit block
      if (err.response?.status === 402) {
        Alert.alert('Credit Limit Exceeded', `${detail}\n\nContact your admin to increase your credit limit.`);
      } else {
        Alert.alert('Order Failed', detail || 'Please try again');
      }
    } finally {
      setPlacing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Delivery Address */}
        <Card>
          <Text style={styles.sectionTitle}>📍 Delivery Address</Text>
          <Input label="Address Line" value={address.line1} onChangeText={t => setAddress(a => ({ ...a, line1: t }))} placeholder="Shop No., Street, Area" />
          <Input label="City" value={address.city} onChangeText={t => setAddress(a => ({ ...a, city: t }))} placeholder="Mumbai" />
          
          <TouchableOpacity 
            style={[styles.stateDropdownContainer, { marginBottom: Spacing.sm }]}
            activeOpacity={0.7}
            onPress={() => setStateModalVisible(true)}>
            <Text style={styles.stateLabel}>State</Text>
            <View style={styles.stateDropdown}>
              <Text style={styles.stateText}>{address.state || 'Select'}</Text>
              <Text style={styles.stateArrow}>▼</Text>
            </View>
          </TouchableOpacity>
          <Input label="Pincode" value={address.pincode} onChangeText={t => setAddress(a => ({ ...a, pincode: t.replace(/\D/g, '').slice(0, 6) }))} keyboardType="number-pad" placeholder="400001" containerStyle={{ marginTop: Spacing.sm }} />
        </Card>

        {/* Coupon */}
        <Card>
          <Text style={styles.sectionTitle}>🏷️ Coupon Code</Text>
          <View style={styles.couponRow}>
            <Input label="" value={coupon} onChangeText={setCoupon} placeholder="Enter coupon code" style={{ flex: 1, marginBottom: 0 }} />
            <Button label="Apply" onPress={applyCoupon} fullWidth={false} size="sm" />
          </View>

          {/* Coupon List */}
          {availableCoupons.length > 0 && (
            <View style={styles.couponListContainer}>
              <Text style={styles.couponListTitle}>Available Coupons (Tap to Apply)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.couponScroll}>
                {availableCoupons.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.couponCard}
                    activeOpacity={0.8}
                    onPress={() => {
                      setCoupon(item.code);
                      api.post('/cart/apply-coupon', { code: item.code })
                        .then(({ data }) => {
                          setDiscount(data.discount_amount || 0);
                          Alert.alert('Coupon Applied', `Discount: ${formatINR(data.discount_amount)}`);
                        })
                        .catch((err) => {
                          const msg = err.response?.data?.message || err.response?.data?.detail || 'Could not apply coupon';
                          Alert.alert('Invalid Coupon', msg);
                        });
                    }}>
                    <View style={styles.couponHeader}>
                      <Text style={styles.couponCodeText}>{item.code}</Text>
                      <Text style={styles.couponValText}>
                        {item.discount_type === 'flat' ? `INR ${item.value / 100} Off` : `${item.value}% Off`}
                      </Text>
                    </View>
                    <Text style={styles.couponDescText} numberOfLines={2}>{item.description}</Text>
                    <Text style={styles.couponMinText}>Min order: {formatINR(item.min_order_value)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </Card>

        {/* State Selection Modal */}
        <Modal visible={stateModalVisible} animationType="slide" transparent>
          <SafeAreaView style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select State</Text>
                <TouchableOpacity onPress={() => setStateModalVisible(false)} style={styles.modalCloseBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={INDIAN_STATES}
                keyExtractor={(item) => item.code}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.stateOption}
                    onPress={() => {
                      setAddress(a => ({ ...a, state: item.code }));
                      setStateModalVisible(false);
                    }}>
                    <Text style={styles.stateOptionText}>{item.name} ({item.code})</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.modalDivider} />}
              />
            </View>
          </SafeAreaView>
        </Modal>

        {/* Order Summary */}
        <Card>
          <Text style={styles.sectionTitle}>📋 Order Summary</Text>
          {cartItems.map(item => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.product_name} × {item.quantity}</Text>
              <Text style={styles.itemPrice}>{formatINR(item.price_snapshot * item.quantity)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.itemRow}><Text style={styles.itemName}>Subtotal</Text><Text style={styles.itemPrice}>{formatINR(subtotal)}</Text></View>
          <View style={styles.itemRow}><Text style={styles.itemName}>GST</Text><Text style={styles.itemPrice}>{formatINR(gst)}</Text></View>
          {discount > 0 && <View style={styles.itemRow}><Text style={[styles.itemName, { color: Colors.secondary }]}>Discount</Text><Text style={[styles.itemPrice, { color: Colors.secondary }]}>-{formatINR(discount)}</Text></View>}
          <View style={styles.divider} />
          <View style={styles.itemRow}>
            <Text style={styles.grandLabel}>Grand Total</Text>
            <Text style={styles.grandValue}>{formatINR(grandTotal - discount)}</Text>
          </View>
        </Card>

        {/* Payment info — Razorpay integration P5-15 */}
        <View style={styles.paymentNote}>
          <Text style={styles.paymentNoteText}>💳 Payment via Razorpay · COD available on delivery</Text>
        </View>

        <Button label="Place Order" onPress={placeOrder} loading={placing} size="lg" />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgPrimary,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.body,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  sectionTitle: { fontSize: Typography.base, fontWeight: '700', marginBottom: Spacing.md, color: Colors.textPrimary },
  rowInputs: { flexDirection: 'row', gap: Spacing.sm },
  couponRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  itemName: { fontSize: Typography.sm, color: Colors.textSecondary, flex: 1 },
  itemPrice: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  grandLabel: { fontSize: Typography.base, fontWeight: '700' },
  grandValue: { fontSize: Typography.base, fontWeight: '800', color: Colors.primary },
  paymentNote: { backgroundColor: Colors.infoLight, borderRadius: Radius.sm, padding: Spacing.md, marginBottom: Spacing.md },
  paymentNoteText: { fontSize: Typography.sm, color: Colors.info, fontWeight: '600' },

  // State Dropdown Styles
  stateDropdownContainer: { width: '100%', marginBottom: Spacing.sm },
  stateLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500', marginBottom: 4 },
  stateDropdown: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.bgCard,
  },
  stateText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  stateArrow: { fontSize: 10, color: Colors.textSecondary },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.bgPrimary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '55%',
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  modalCloseBtn: { padding: 4 },
  modalCloseText: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
  stateOption: { paddingVertical: 14, paddingHorizontal: Spacing.sm },
  stateOptionText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  modalDivider: { height: 1, backgroundColor: Colors.border },

  // Coupon List Styles
  couponListContainer: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  couponListTitle: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.sm },
  couponScroll: { gap: Spacing.sm, paddingRight: Spacing.md },
  couponCard: {
    width: 220,
    borderWidth: 1.5,
    borderColor: '#9E7A00',
    borderRadius: Radius.sm,
    padding: Spacing.sm + 2,
    backgroundColor: '#FFFDF0',
  },
  couponHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  couponCodeText: { fontSize: 13, fontWeight: '800', color: '#9E7A00', letterSpacing: 0.5 },
  couponValText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    backgroundColor: '#9E7A00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  couponDescText: { fontSize: 11, color: Colors.textSecondary, marginBottom: 4, lineHeight: 14 },
  couponMinText: { fontSize: 9, fontWeight: '600', color: Colors.textMuted },
});

export default CheckoutScreen;
