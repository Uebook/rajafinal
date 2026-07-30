import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().optional(),
  mobile: z.string().optional(),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1),
});

export const otpSendSchema = z.object({
  mobile: z.string().min(10).max(15),
  purpose: z.enum(['login', 'register', 'change_mobile']).default('login'),
});

export const otpVerifySchema = z.object({
  mobile: z.string().min(10).max(15),
  otp: z.string().min(6).max(6),
  purpose: z.enum(['login', 'register', 'change_mobile']).default('login'),
});

export const vendorCreateSchema = z.object({
  mobile: z.string().min(10).max(15),
  full_name: z.string().min(2).max(255),
  business_name: z.string().min(2).max(255),
  password: z.string().min(6).max(128),
  gst_number: z.string().optional().nullable(),
  pan_number: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  geo_location: z.record(z.any()).optional().nullable(),
});

export const retailerRegisterSchema = z.object({
  mobile: z.string().min(10).max(15),
  owner_name: z.string().min(2).max(255),
  business_name: z.string().min(2).max(255),
  business_type: z.string().optional().nullable(),
  gst_number: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  geo_location: z.record(z.any()).optional().nullable(),
});

export const changePasswordSchema = z.object({
  old_password: z.string(),
  new_password: z.string().min(8),
});

export const adminCreateSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  mobile: z.string().min(10).max(15),
  password: z.string().min(8),
});

export const userStatusUpdateSchema = z.object({
  status: z.enum(['active', 'blocked']),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().optional(),
  email: z.string().email().optional(),
  avatar_url: z.string().url().optional(),
});
